// URL 중복 제거 — Supabase 배치 조회
// 수집된 URL 목록을 한 번에 조회 → 신규 URL만 반환

import { createServerClient } from '@/lib/supabase/server'
import type { ParsedArticle } from '@/lib/collectors/naver'

export async function filterNewArticles(articles: ParsedArticle[]): Promise<ParsedArticle[]> {
  if (articles.length === 0) return []

  const supabase = createServerClient()
  const urls = articles.map((a) => a.url)

  const { data, error } = await supabase
    .from('ins_news_articles')
    .select('url')
    .in('url', urls)

  if (error) {
    console.error('[deduplicator] Supabase 조회 실패:', error)
    // 에러 시 전체 통과 (중복 INSERT는 DO NOTHING으로 처리)
    return articles
  }

  const existingUrls = new Set(data?.map((r) => r.url) ?? [])
  return articles.filter((a) => !existingUrls.has(a.url))
}
