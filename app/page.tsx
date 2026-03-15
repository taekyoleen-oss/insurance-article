import { toKSTDateString } from '@/lib/utils/date-kst'
import { getAvailableEditions, getEditionArticles } from '@/lib/supabase/queries'
import type { Edition } from '@/types'
import DashboardClient from '@/components/dashboard-client'

export const revalidate = 300

export default async function HomePage() {
  const today = toKSTDateString()

  let editions: Edition[] = []
  try {
    editions = await getAvailableEditions(today)
  } catch {
    editions = []
  }

  const defaultEdition: Edition | null = editions.includes('14:00')
    ? '14:00'
    : editions.includes('08:00')
    ? '08:00'
    : null

  const articles =
    defaultEdition && editions.length > 0
      ? await getEditionArticles(today, defaultEdition).catch(() => [])
      : []

  const availableEditions = editions.length > 0 ? editions : []

  return (
    <DashboardClient
      initialArticles={articles}
      initialDate={today}
      initialEdition={defaultEdition}
      availableEditions={availableEditions}
    />
  )
}
