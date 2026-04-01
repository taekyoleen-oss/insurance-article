// POST /api/manual-collect?edition=0800|1400
// 수동 업데이트 — 인증 불필요, 주말 체크 스킵, 48시간 윈도우 사용

import { NextRequest, NextResponse } from 'next/server'
import { collectAllKeywords } from '@/lib/collectors/naver'
import { filterNewArticles } from '@/lib/deduplicator'
import { validateArticles } from '@/lib/validators/claude-validator'
import { processArticles, fallbackClusters } from '@/lib/summarizer'
import { createServerClient } from '@/lib/supabase/server'
import {
  toKSTDateString,
  parseEditionParam,
  getTestCollectionWindow,
} from '@/lib/utils/date-kst'
import type { Edition } from '@/types'

const MAX_ARTICLES = 20

// KST 현재 시각 기준 에디션 자동 감지
function detectEditionFromKST(): Edition {
  const kstHour = parseInt(
    new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      hour: 'numeric',
      hour12: false,
    }).format(new Date()),
    10,
  )
  return kstHour >= 14 ? '14:00' : '08:00'
}

export async function POST(req: NextRequest) {
  // edition 파라미터 파싱 — 없으면 현재 시각 기준 자동 감지
  const editionParam = req.nextUrl.searchParams.get('edition')
  const edition: Edition = editionParam
    ? (parseEditionParam(editionParam) ?? detectEditionFromKST())
    : detectEditionFromKST()

  const editionDate = toKSTDateString()
  // 수동 업데이트는 항상 48시간 윈도우 사용
  const collectionWindow = getTestCollectionWindow()

  console.log(`[manual-collect] 수동 업데이트 시작 — edition=${edition}, date=${editionDate}, window=${collectionWindow.label}`)

  try {
    // Step 1: 네이버 API 수집
    const collected = await collectAllKeywords(1)
    console.log(`[manual-collect] 수집: ${collected.length}건`)

    // Step 2: 시간 윈도우 필터 + URL 중복 제거
    const newArticles = await filterNewArticles(collected, collectionWindow)
    console.log(`[manual-collect] 필터링 후: ${newArticles.length}건`)

    if (newArticles.length === 0) {
      return NextResponse.json({
        collected: collected.length,
        inserted: 0,
        edition,
        editionDate,
        message: '새 기사가 없습니다. 이미 최신 상태입니다.',
      })
    }

    // Step 3: Claude 관련성 검증
    console.log(`[manual-collect] Claude 검증 시작 (최대 ${MAX_ARTICLES}건)`)
    const validated = await validateArticles(newArticles, MAX_ARTICLES)
    console.log(`[manual-collect] 검증 통과: ${validated.length}건`)

    if (validated.length === 0) {
      return NextResponse.json({
        collected: collected.length,
        inserted: 0,
        edition,
        editionDate,
        message: '검증 통과 기사가 없습니다.',
      })
    }

    // Step 4: Supabase INSERT
    const supabase = createServerClient()
    const baseRows = validated.map((a) => ({
      title: a.title,
      url: a.url,
      naver_link: a.naver_link,
      snippet: a.snippet,
      source: a.source,
      published_at: a.published_at,
      edition: edition as Edition,
      edition_date: editionDate,
      category: a.validatedCategory,
      is_representative: true,
    }))

    const { data: inserted, error: insertError } = await supabase
      .from('ins_news_articles')
      .insert(baseRows)
      .select('id, url')

    if (insertError) {
      console.error('[manual-collect] INSERT 실패:', insertError)
      return NextResponse.json({ error: 'DB insert failed' }, { status: 500 })
    }

    // Step 5: Haiku 요약 + 클러스터링
    const urlToId = new Map(inserted!.map((r) => [r.url, r.id]))
    const validatedCategoryMap = new Map(
      validated.map((a) => [a.url, a.validatedCategory]),
    )
    const articleInputs = validated.map((a) => ({
      id: urlToId.get(a.url)!,
      title: a.title,
      source: a.source,
      snippet: a.snippet,
      validatedCategory: a.validatedCategory,
    }))

    const haikuResult = await processArticles(articleInputs)
    const clusters = haikuResult?.clusters ?? fallbackClusters(articleInputs)
    const summaryMap = new Map(haikuResult?.summaries.map((s) => [s.id, s]) ?? [])

    // Step 6: 요약 + 클러스터 업데이트
    for (const cluster of clusters) {
      const repId = cluster.representative_id
      const summary = summaryMap.get(repId)
      const repUrl = inserted!.find((r) => r.id === repId)?.url
      const repCategory =
        (repUrl ? validatedCategoryMap.get(repUrl) : null) ?? summary?.category ?? null

      await supabase
        .from('ins_news_articles')
        .update({
          cluster_id: repId,
          is_representative: true,
          summary: summary?.summary ?? null,
          summary_short: summary?.summary_short ?? null,
          category: repCategory,
        })
        .eq('id', repId)

      for (const simId of cluster.similar_ids) {
        const simSummary = summaryMap.get(simId)
        const simUrl = inserted!.find((r) => r.id === simId)?.url
        const simCategory =
          (simUrl ? validatedCategoryMap.get(simUrl) : null) ?? simSummary?.category ?? null

        await supabase
          .from('ins_news_articles')
          .update({
            cluster_id: repId,
            is_representative: false,
            summary: simSummary?.summary ?? null,
            summary_short: simSummary?.summary_short ?? null,
            category: simCategory,
          })
          .eq('id', simId)
      }
    }

    console.log(`[manual-collect] 완료: inserted=${inserted!.length}건`)
    return NextResponse.json({
      collected: collected.length,
      inserted: inserted!.length,
      edition,
      editionDate,
      message: `${inserted!.length}건의 기사가 업데이트되었습니다.`,
    })
  } catch (e) {
    console.error('[manual-collect] 예외:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
