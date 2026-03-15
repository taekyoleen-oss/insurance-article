// GET /api/search?q={keyword}
// 실시간 검색 — 네이버 뉴스 API 프록시 (DB 미저장)

import { NextRequest, NextResponse } from 'next/server'
import { sanitize, truncateSnippet } from '@/lib/utils/snippet'
import type { SearchResult } from '@/types'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q) {
    return NextResponse.json({ error: 'q is required' }, { status: 400 })
  }

  const url = new URL('https://openapi.naver.com/v1/search/news.json')
  url.searchParams.set('query', q)
  url.searchParams.set('display', '10')
  url.searchParams.set('sort', 'date')

  try {
    const res = await fetch(url.toString(), {
      headers: {
        'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID!,
        'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET!,
      },
    })

    if (!res.ok) {
      return NextResponse.json({ error: '네이버 API 오류' }, { status: res.status })
    }

    const json = await res.json()
    const results: SearchResult[] = (json.items ?? []).map(
      (item: { title: string; link: string; description: string; pubDate: string; originallink: string }) => ({
        title: sanitize(item.title),
        link: item.link,
        snippet: truncateSnippet(item.description, 100),
        pubDate: new Date(item.pubDate).toISOString(),
        originallink: item.originallink,
      }),
    )

    return NextResponse.json({ results })
  } catch (e) {
    console.error('[/api/search] 실패:', e)
    return NextResponse.json({ error: '검색에 실패했습니다' }, { status: 500 })
  }
}
