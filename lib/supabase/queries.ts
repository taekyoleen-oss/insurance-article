import { createServerClient } from './server'
import type { NewsArticleWithSimilar, Edition, Category } from '@/types'

// 에디션 기사 조회 — PostgreSQL 함수 호출
export async function getEditionArticles(
  editionDate: string,   // 'YYYY-MM-DD'
  edition: Edition,
  category?: Category,
): Promise<NewsArticleWithSimilar[]> {
  const supabase = createServerClient()

  const { data, error } = await supabase.rpc('get_edition_articles', {
    p_edition_date: editionDate,
    p_edition: edition,
    p_category: category ?? null,
  })

  if (error) throw error
  return (data ?? []) as NewsArticleWithSimilar[]
}

// 기사가 존재하는 모든 날짜+에디션 목록 (최신순)
export interface DateWithEditions {
  date: string       // 'YYYY-MM-DD'
  editions: Edition[]
}

export async function getAllDatesWithEditions(): Promise<DateWithEditions[]> {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('ins_news_articles')
    .select('edition_date, edition')
    .eq('is_representative', true)
    .order('edition_date', { ascending: false })
    .order('edition', { ascending: false })

  if (error) return []

  // edition_date별로 editions 묶기
  const map = new Map<string, Set<Edition>>()
  for (const row of data ?? []) {
    if (!row.edition_date) continue
    if (!map.has(row.edition_date)) map.set(row.edition_date, new Set())
    map.get(row.edition_date)!.add(row.edition as Edition)
  }

  return Array.from(map.entries()).map(([date, edSet]) => ({
    date,
    editions: [...edSet].sort((a, b) => (a > b ? -1 : 1)), // 14:00 먼저
  }))
}

// 특정 날짜에 어떤 에디션이 존재하는지 확인
export async function getAvailableEditions(
  editionDate: string,
): Promise<Edition[]> {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('ins_news_articles')
    .select('edition')
    .eq('edition_date', editionDate)
    .eq('is_representative', true)

  if (error) throw error

  const editions = [...new Set(data?.map((r) => r.edition as Edition))]
  return editions
}
