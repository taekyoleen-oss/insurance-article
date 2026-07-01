// 기사 원문 본문 추출 — 요약 충실도 향상을 위해 수집 시점에 실제 기사 본문을 가져온다.
// 실패(타임아웃·차단·비HTML) 시 null 반환 → 호출부에서 snippet 폴백.

import he from 'he'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'

// 요약 재료로 넘길 본문 최대 길이 (토큰 폭증 방지)
const MAX_BODY_CHARS = 2000

// <meta property/name="..."> content 추출 (속성 순서 양쪽 대응)
function extractMeta(html: string, keys: string[]): string | null {
  for (const key of keys) {
    const re1 = new RegExp(
      `<meta[^>]+(?:property|name)=["']${key}["'][^>]*?content=["']([^"']*)["']`,
      'i',
    )
    const m1 = html.match(re1)
    if (m1?.[1]) return he.decode(m1[1]).trim()

    const re2 = new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]*?(?:property|name)=["']${key}["']`,
      'i',
    )
    const m2 = html.match(re2)
    if (m2?.[1]) return he.decode(m2[1]).trim()
  }
  return null
}

// HTML 조각 → 순수 텍스트 (스크립트·네비게이션 등 비본문 요소 제거 후 태그 제거)
function htmlToText(fragment: string): string {
  return he
    .decode(
      fragment
        .replace(
          /<(script|style|noscript|iframe|header|nav|footer|aside|figure|figcaption|form)[\s\S]*?<\/\1>/gi,
          ' ',
        )
        .replace(/<[^>]+>/g, ' '),
    )
    .replace(/\s+/g, ' ')
    .trim()
}

// HTML 문서에서 기사 요약 재료 텍스트 추출
// → og:description(퍼블리셔 자체 요약) + 본문 영역 텍스트를 결합
export function extractArticleText(html: string): string | null {
  const metaDesc = extractMeta(html, ['og:description', 'twitter:description', 'description'])

  // 본문 영역 우선순위: <article> → <body>
  let region: string | null = null
  const article = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)
  if (article) region = article[1]
  if (!region) {
    const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    if (body) region = body[1]
  }
  const bodyText = region ? htmlToText(region) : ''

  const parts: string[] = []
  if (metaDesc) parts.push(metaDesc)
  if (bodyText.length > 120) parts.push(bodyText.slice(0, MAX_BODY_CHARS))

  const combined = parts.join('\n').trim()
  return combined.length >= 60 ? combined : null
}

// 단일 URL 본문 수집 (타임아웃·실패 시 null). fallbackUrl은 originallink 실패 시 naver.me 등 대체 경로.
export async function fetchArticleBody(
  url: string,
  fallbackUrl?: string,
  timeoutMs = 4000,
): Promise<string | null> {
  const tryFetch = async (target: string): Promise<string | null> => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(target, {
        signal: controller.signal,
        headers: { 'User-Agent': UA, 'Accept-Language': 'ko-KR,ko;q=0.9' },
        redirect: 'follow',
      })
      if (!res.ok) return null
      const ct = res.headers.get('content-type') ?? ''
      if (!ct.includes('html')) return null
      const html = await res.text()
      return extractArticleText(html)
    } catch {
      return null
    } finally {
      clearTimeout(timer)
    }
  }

  const primary = await tryFetch(url)
  if (primary) return primary
  if (fallbackUrl && fallbackUrl !== url) return tryFetch(fallbackUrl)
  return null
}
