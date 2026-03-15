// 네이버 뉴스 검색 API 수집 모듈
// SKILL: .claude/skills/news-collector/SKILL.md 참조

import { sanitize, truncateSnippet } from '@/lib/utils/snippet'

export interface NaverNewsRaw {
  title: string
  originallink: string
  link: string
  description: string
  pubDate: string
}

export interface ParsedArticle {
  url: string           // originallink 우선, 없으면 link
  naver_link: string    // link (naver.me URL)
  title: string
  snippet: string
  source: string
  published_at: string  // ISO 8601
}

// URL에서 출처명 추출
export function extractSource(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace('www.', '')
    const known: Record<string, string> = {
      'yna.co.kr': '연합뉴스',
      'hankyung.com': '한국경제',
      'mk.co.kr': '매일경제',
      'chosun.com': '조선일보',
      'joins.com': '중앙일보',
      'donga.com': '동아일보',
      'newsis.com': '뉴시스',
      'news1.kr': '뉴스1',
      'fnnews.com': '파이낸셜뉴스',
      'insurancenews.co.kr': '보험뉴스',
      'insnews.co.kr': '인슈어런스',
    }
    return known[hostname] ?? hostname
  } catch {
    return '알 수 없음'
  }
}

// 네이버 API 응답 → ParsedArticle 변환
function parseItem(item: NaverNewsRaw): ParsedArticle {
  const url = item.originallink?.trim() || item.link
  return {
    url,
    naver_link: item.link,
    title: sanitize(item.title),
    snippet: truncateSnippet(item.description, 100),
    source: extractSource(url),
    published_at: new Date(item.pubDate).toISOString(),
  }
}

// 지수 백오프 재시도
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let lastError: Error | undefined
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url, options)
      if (res.status === 429) {
        const delay = Math.pow(2, attempt) * 1000
        await new Promise((r) => setTimeout(r, delay))
        continue
      }
      return res
    } catch (e) {
      lastError = e as Error
      const delay = Math.pow(2, attempt) * 1000
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw lastError ?? new Error('fetch failed after retries')
}

// 키워드 1개에 대해 네이버 뉴스 검색
// displayCount: 평상시 10건, 월요일 08:00(주말 포함) 30건
export async function fetchNaverNews(keyword: string, displayCount = 10): Promise<ParsedArticle[]> {
  const clientId = process.env.NAVER_CLIENT_ID!
  const clientSecret = process.env.NAVER_CLIENT_SECRET!

  const url = new URL('https://openapi.naver.com/v1/search/news.json')
  url.searchParams.set('query', keyword)
  url.searchParams.set('display', String(Math.min(displayCount, 100))) // 네이버 API 최대 100
  url.searchParams.set('sort', 'date')

  const res = await fetchWithRetry(url.toString(), {
    headers: {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
    },
  })

  if (!res.ok) {
    console.error(`[naver] keyword="${keyword}" status=${res.status}`)
    return []
  }

  const json = await res.json()
  return (json.items as NaverNewsRaw[]).map(parseItem)
}

// 모든 키워드 수집 (순차 실행)
// displayPerKeyword: 평상시 10건, 월요일 08:00 30건 (토·일 포함)
export async function collectAllKeywords(displayPerKeyword = 10): Promise<ParsedArticle[]> {
  const keywords = (process.env.COLLECT_KEYWORDS ?? '보험,보험료,보험상품,금감원 보험')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)

  const results: ParsedArticle[] = []

  for (const keyword of keywords) {
    const articles = await fetchNaverNews(keyword, displayPerKeyword)
    results.push(...articles)
  }

  // URL 기준 중복 제거 (동일 키워드 중복 결과)
  const seen = new Set<string>()
  return results.filter((a) => {
    if (seen.has(a.url)) return false
    seen.add(a.url)
    return true
  })
}
