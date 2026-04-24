// 기사 중복 제거 — 4단계 필터링
// 1. 시간 윈도우 필터 (에디션 기간 외 기사 제거)
// 2. URL 중복 제거 (Supabase 배치 조회)
// 3. 제목 유사도 필터 (최근 24시간 DB 기사와 비교)
// 4. 배치 내 유사도 필터 (같은 수집 배치 내 기사 간 비교)

import { createServerClient } from '@/lib/supabase/server'
import type { ParsedArticle } from '@/lib/collectors/naver'
import type { CollectionWindow } from '@/lib/utils/date-kst'

// ── 제목 유사도 (Bigram Dice Coefficient) ─────────────────
// 한국어 뉴스 제목에 적합 — 공백 제거 후 2글자 단위 비교
// 0.0 (완전 다름) ~ 1.0 (완전 동일)

// DB 비교 임계값: 0.60 (이전 에디션 대비 중복 검출 강화)
const DB_SIMILARITY_THRESHOLD = 0.60
// 배치 내 임계값: 0.65 (같은 에디션 내 다른 키워드에서 수집된 동일 기사 제거)
const BATCH_SIMILARITY_THRESHOLD = 0.65

function bigramDice(a: string, b: string): number {
  const normalize = (s: string) => s.replace(/\s+/g, '').toLowerCase()
  const na = normalize(a)
  const nb = normalize(b)

  if (na === nb) return 1
  if (na.length < 2 || nb.length < 2) return 0

  const bigrams = (s: string): Map<string, number> => {
    const m = new Map<string, number>()
    for (let i = 0; i < s.length - 1; i++) {
      const bg = s.slice(i, i + 2)
      m.set(bg, (m.get(bg) ?? 0) + 1)
    }
    return m
  }

  const bA = bigrams(na)
  const bB = bigrams(nb)

  let intersection = 0
  for (const [bg, countA] of bA) {
    intersection += Math.min(countA, bB.get(bg) ?? 0)
  }

  const totalA = na.length - 1
  const totalB = nb.length - 1
  return totalA + totalB === 0 ? 0 : (2 * intersection) / (totalA + totalB)
}

// ── 메인 필터 함수 ────────────────────────────────────────

export async function filterNewArticles(
  articles: ParsedArticle[],
  window?: CollectionWindow,
): Promise<ParsedArticle[]> {
  if (articles.length === 0) return []

  // ─ Step 1: 시간 윈도우 필터 ─────────────────────────────
  let filtered = articles

  if (window) {
    filtered = articles.filter((a) => {
      const pub = new Date(a.published_at)
      return pub >= window.start && pub <= window.end
    })
    console.log(
      `[deduplicator] 시간 필터 (${window.label}): ${articles.length}건 → ${filtered.length}건`,
    )
  }

  if (filtered.length === 0) return []

  const supabase = createServerClient()

  // ─ Step 2: URL 기준 Supabase 중복 제거 ──────────────────
  const urls = filtered.map((a) => a.url)
  const { data: existingByUrl, error: urlError } = await supabase
    .from('ins_news_articles')
    .select('url')
    .in('url', urls)

  if (urlError) {
    console.error('[deduplicator] URL 조회 실패:', urlError.message)
    // 오류 시 전체 통과 (INSERT DO NOTHING이 최종 방어선)
  } else {
    const existingUrlSet = new Set((existingByUrl ?? []).map((r) => r.url))
    const before = filtered.length
    filtered = filtered.filter((a) => !existingUrlSet.has(a.url))
    console.log(`[deduplicator] URL 중복 제거: ${before}건 → ${filtered.length}건`)
  }

  if (filtered.length === 0) return []

  // ─ Step 3: 전일 기사 제목 유사도 필터 ───────────────────
  // 최근 24시간 DB 기사 제목과 비교 → 65% 이상 유사하면 제거
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const { data: recentArticles, error: recentError } = await supabase
    .from('ins_news_articles')
    .select('title')
    .gte('collected_at', oneDayAgo.toISOString())

  if (recentError) {
    console.error('[deduplicator] 최근 기사 조회 실패:', recentError.message)
  } else if (recentArticles && recentArticles.length > 0) {
    const recentTitles = recentArticles.map((r) => r.title as string)
    const before = filtered.length

    filtered = filtered.filter((article) => {
      const maxSim = recentTitles.reduce(
        (max, t) => Math.max(max, bigramDice(article.title, t)),
        0,
      )
      if (maxSim >= DB_SIMILARITY_THRESHOLD) {
        console.log(
          `[deduplicator] 전일 유사 제목 제외 (${Math.round(maxSim * 100)}%): ${article.title.slice(0, 40)}`,
        )
        return false
      }
      return true
    })

    console.log(
      `[deduplicator] 유사도 필터 (DB ${recentArticles.length}건 비교): ${before}건 → ${filtered.length}건`,
    )
  }

  if (filtered.length === 0) return []

  // ─ Step 4: 배치 내 유사도 필터 ──────────────────────────
  // 같은 에디션 내 다른 키워드에서 수집된 동일 주제 기사 제거
  {
    const accepted: ParsedArticle[] = []
    for (const article of filtered) {
      const hasSimilar = accepted.some(
        (prev) => bigramDice(article.title, prev.title) >= BATCH_SIMILARITY_THRESHOLD,
      )
      if (hasSimilar) {
        console.log(`[deduplicator] 배치 내 중복 제외: ${article.title.slice(0, 40)}`)
      } else {
        accepted.push(article)
      }
    }
    if (accepted.length < filtered.length) {
      console.log(`[deduplicator] 배치 내 중복 제거: ${filtered.length}건 → ${accepted.length}건`)
    }
    filtered = accepted
  }

  return filtered
}
