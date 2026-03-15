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
