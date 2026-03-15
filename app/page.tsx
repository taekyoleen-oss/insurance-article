import { toKSTDateString } from '@/lib/utils/date-kst'
import { getEditionArticles, getAllDatesWithEditions } from '@/lib/supabase/queries'
import type { Edition } from '@/types'
import DashboardClient from '@/components/dashboard-client'

export const revalidate = 300

export default async function HomePage() {
  const today = toKSTDateString()

  // 모든 날짜+에디션 목록 (사이드바용)
  const allDates = await getAllDatesWithEditions().catch(() => [])

  // 기본 선택: 오늘 또는 가장 최근 날짜
  const defaultDateEntry = allDates.find((d) => d.date === today) ?? allDates[0] ?? null
  const defaultEdition: Edition | null = defaultDateEntry
    ? (defaultDateEntry.editions.includes('14:00') ? '14:00' : defaultDateEntry.editions[0] ?? null)
    : null
  const defaultDate = defaultDateEntry?.date ?? today

  const articles =
    defaultEdition
      ? await getEditionArticles(defaultDate, defaultEdition).catch(() => [])
      : []

  return (
    <DashboardClient
      initialArticles={articles}
      initialDate={defaultDate}
      initialEdition={defaultEdition}
      allDates={allDates}
    />
  )
}
