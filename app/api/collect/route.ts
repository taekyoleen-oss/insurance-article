// POST /api/collect?edition=0800|1400
// Vercel Cron 트리거 — CRON_SECRET 헤더 검증 필수

import { NextRequest, NextResponse } from 'next/server'
import { collectAllKeywords } from '@/lib/collectors/naver'
import { filterNewArticles } from '@/lib/deduplicator'
import { processArticles, fallbackClusters } from '@/lib/summarizer'
import { createServerClient } from '@/lib/supabase/server'
import { toKSTDateString, parseEditionParam, isKSTWeekend, isKSTMonday } from '@/lib/utils/date-kst'
import type { Edition } from '@/types'

export async function GET(req: NextRequest) {
  // 1. Cron 인증 검증
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. edition 파라미터 파싱
  const editionParam = req.nextUrl.searchParams.get('edition')
  const edition = parseEditionParam(editionParam)
  if (!edition) {
    return NextResponse.json(
      { error: 'Invalid edition. Use ?edition=0800 or ?edition=1400' },
      { status: 400 },
    )
  }

  // 3. KST 날짜 계산 + 주말 체크
  const editionDate = toKSTDateString()

  if (isKSTWeekend()) {
    console.log(`[collect] 주말 스킵 (${editionDate})`)
    return NextResponse.json({ skipped: true, reason: 'weekend', editionDate })
  }

  // 월요일 08:00이면 토·일 기사까지 포함하도록 키워드당 30건 수집
  const isMonday08 = isKSTMonday() && edition === '08:00'
  const displayPerKeyword = isMonday08 ? 30 : 10

  if (isMonday08) {
    console.log(`[collect] 월요일 08:00 — 주말 포함 확장 수집 (키워드당 ${displayPerKeyword}건)`)
  }

  try {
    // 4. 네이버 API 수집
    const collected = await collectAllKeywords(displayPerKeyword)
    console.log(`[collect] 수집: ${collected.length}건, edition=${edition}, date=${editionDate}`)

    // 5. Supabase 배치 조회 → 신규 URL만 추출
    const newArticles = await filterNewArticles(collected)
    console.log(`[collect] 신규: ${newArticles.length}건`)

    if (newArticles.length === 0) {
      return NextResponse.json({ collected: collected.length, inserted: 0, edition, editionDate })
    }

    // 6. Supabase에 기본 정보 먼저 INSERT (id 확보)
    const supabase = createServerClient()
    const baseRows = newArticles.map((a) => ({
      title: a.title,
      url: a.url,
      naver_link: a.naver_link,
      snippet: a.snippet,
      source: a.source,
      published_at: a.published_at,
      edition: edition as Edition,
      edition_date: editionDate,
      is_representative: true,  // 임시값, 클러스터링 후 업데이트
    }))

    const { data: inserted, error: insertError } = await supabase
      .from('ins_news_articles')
      .insert(baseRows)
      .select('id, url')

    if (insertError) {
      console.error('[collect] INSERT 실패:', insertError)
      return NextResponse.json({ error: 'DB insert failed' }, { status: 500 })
    }

    // 7. Haiku 1회 호출 — 요약 + 클러스터링
    const urlToId = new Map(inserted!.map((r) => [r.url, r.id]))
    const articleInputs = newArticles.map((a) => ({
      id: urlToId.get(a.url)!,
      title: a.title,
      source: a.source,
      snippet: a.snippet,
    }))

    const haikuResult = await processArticles(articleInputs)
    console.log(`[collect] Haiku 결과: summaries=${haikuResult?.summaries.length ?? 'null'}, clusters=${haikuResult?.clusters.length ?? 'null'}`)

    const clusters = haikuResult?.clusters ?? fallbackClusters(articleInputs)
    const summaryMap = new Map(haikuResult?.summaries.map((s) => [s.id, s]) ?? [])

    // 8. 요약 + 클러스터 관계 일괄 업데이트
    for (const cluster of clusters) {
      const repId = cluster.representative_id
      const summary = summaryMap.get(repId)

      const { error: updateError } = await supabase
        .from('ins_news_articles')
        .update({
          cluster_id: repId,
          is_representative: true,
          summary: summary?.summary ?? null,
          summary_short: summary?.summary_short ?? null,
          category: summary?.category ?? null,
        })
        .eq('id', repId)
      if (updateError) console.error('[collect] UPDATE 실패:', repId, updateError.message)

      for (const simId of cluster.similar_ids) {
        const simSummary = summaryMap.get(simId)
        await supabase
          .from('ins_news_articles')
          .update({
            cluster_id: repId,
            is_representative: false,
            summary: simSummary?.summary ?? null,
            summary_short: simSummary?.summary_short ?? null,
            category: simSummary?.category ?? null,
          })
          .eq('id', simId)
      }
    }

    console.log(`[collect] 완료: inserted=${inserted!.length}건`)
    return NextResponse.json({
      collected: collected.length,
      inserted: inserted!.length,
      edition,
      editionDate,
    })
  } catch (e) {
    console.error('[collect] 예외:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
