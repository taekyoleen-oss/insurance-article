// GET /api/news?date=YYYY-MM-DD&edition=08:00|14:00&category=...
// 정기 수집 기사 조회 — ISR + Cache-Control

import { NextRequest, NextResponse } from 'next/server'
import { getEditionArticles } from '@/lib/supabase/queries'
import type { Edition, Category } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const date = searchParams.get('date')
  const edition = searchParams.get('edition') as Edition | null
  const category = searchParams.get('category') as Category | null

  if (!date || !edition) {
    return NextResponse.json({ error: 'date and edition are required' }, { status: 400 })
  }

  if (!['08:00', '14:00'].includes(edition)) {
    return NextResponse.json({ error: 'Invalid edition' }, { status: 400 })
  }

  try {
    const articles = await getEditionArticles(date, edition, category ?? undefined)

    return NextResponse.json(
      { articles },
      {
        headers: {
          'Cache-Control': 's-maxage=300, stale-while-revalidate',
        },
      },
    )
  } catch (e) {
    console.error('[/api/news] 조회 실패:', e)
    return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 })
  }
}
