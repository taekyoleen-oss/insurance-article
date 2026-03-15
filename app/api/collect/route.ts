// POST /api/collect?edition=0800|1400
// Vercel Cron 트리거 — CRON_SECRET 헤더 검증 필수

import { NextRequest, NextResponse } from 'next/server'
import { collectAllKeywords } from '@/lib/collectors/naver'
import { filterNewArticles } from '@/lib/deduplicator'
import { validateArticles } from '@/lib/validators/claude-validator'
import { processArticles, fallbackClusters } from '@/lib/summarizer'
import { createServerClient } from '@/lib/supabase/server'
import {
  toKSTDateString,
  parseEditionParam,
  isKSTWeekend,
  isKSTMonday,
  getCollectionWindow,
  getTestCollectionWindow,
} from '@/lib/utils/date-kst'
import type { Edition } from '@/types'

const MAX_ARTICLES = 20

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

  // 3. 테스트 모드 + KST 날짜 계산 + 주말 체크
  const isTestMode = req.nextUrl.searchParams.get('test') === 'true'
  const editionDate = toKSTDateString()

  // 테스트 모드는 2026-03-15 하루만 허용
  const TEST_ALLOWED_DATE = '2026-03-15'
  if (isTestMode && editionDate !== TEST_ALLOWED_DATE) {
    return NextResponse.json(
      { error: `Test mode only allowed on ${TEST_ALLOWED_DATE}` },
      { status: 403 },
    )
  }

  if (!isTestMode && isKSTWeekend()) {
    console.log(`[collect] 주말 스킵 (${editionDate})`)
    return NextResponse.json({ skipped: true, reason: 'weekend', editionDate })
  }

  // 월요일 08:00이면 토·일 기사까지 포함하도록 3배 수집
  const isMonday08 = isKSTMonday() && edition === '08:00'
  const displayMultiplier = isMonday08 ? 3 : 1

  // 수집 시간 윈도우 결정
  const collectionWindow = isTestMode
    ? getTestCollectionWindow()
    : getCollectionWindow(edition, isMonday08)

  if (isTestMode) {
    console.log(`[collect] 🧪 테스트 모드 — ${collectionWindow.label}`)
  } else if (isMonday08) {
    console.log(`[collect] 월요일 08:00 — 주말 포함 확장 수집 (3배)`)
  }

  console.log(`[collect] 수집 윈도우: ${collectionWindow.label}`)

  try {
    // Step 1: 네이버 API 수집 (SEARCH_KEYWORDS 전체 순회)
    const collected = await collectAllKeywords(displayMultiplier)
    console.log(`[collect] 수집: ${collected.length}건, edition=${edition}, date=${editionDate}`)

    // Step 2: 시간 윈도우 필터 + URL 중복 제거 + 유사 제목 제거
    const newArticles = await filterNewArticles(collected, collectionWindow)
    console.log(`[collect] 필터링 후: ${newArticles.length}건`)

    if (newArticles.length === 0) {
      return NextResponse.json({ collected: collected.length, inserted: 0, edition, editionDate })
    }

    // Step 3: Claude 관련성 검증 — 최대 MAX_ARTICLES건만 통과
    console.log(`[collect] Claude 검증 시작 (최대 ${MAX_ARTICLES}건)`)
    const validated = await validateArticles(newArticles, MAX_ARTICLES)
    console.log(`[collect] 검증 통과: ${validated.length}건`)

    if (validated.length === 0) {
      return NextResponse.json({ collected: collected.length, inserted: 0, edition, editionDate })
    }

    // Step 4: Supabase에 검증된 기사만 INSERT (id 확보)
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
      category: a.validatedCategory,  // 검증 단계에서 결정된 카테고리 선저장
      is_representative: true,         // 임시값, 클러스터링 후 업데이트
    }))

    const { data: inserted, error: insertError } = await supabase
      .from('ins_news_articles')
      .insert(baseRows)
      .select('id, url')

    if (insertError) {
      console.error('[collect] INSERT 실패:', insertError)
      return NextResponse.json({ error: 'DB insert failed' }, { status: 500 })
    }

    // Step 5: Haiku 1회 호출 — 요약 + 클러스터링 (검증 통과 기사만)
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
    console.log(`[collect] Haiku 결과: summaries=${haikuResult?.summaries.length ?? 'null'}, clusters=${haikuResult?.clusters.length ?? 'null'}`)

    const clusters = haikuResult?.clusters ?? fallbackClusters(articleInputs)
    const summaryMap = new Map(haikuResult?.summaries.map((s) => [s.id, s]) ?? [])

    // Step 6: 요약 + 클러스터 관계 일괄 업데이트
    // category는 검증 단계(Step 3) 값 우선, Haiku 값은 폴백으로만 사용
    for (const cluster of clusters) {
      const repId = cluster.representative_id
      const summary = summaryMap.get(repId)
      const repUrl = inserted!.find((r) => r.id === repId)?.url
      const repCategory = (repUrl ? validatedCategoryMap.get(repUrl) : null)
        ?? summary?.category
        ?? null

      const { error: updateError } = await supabase
        .from('ins_news_articles')
        .update({
          cluster_id: repId,
          is_representative: true,
          summary: summary?.summary ?? null,
          summary_short: summary?.summary_short ?? null,
          category: repCategory,
        })
        .eq('id', repId)
      if (updateError) console.error('[collect] UPDATE 실패:', repId, updateError.message)

      for (const simId of cluster.similar_ids) {
        const simSummary = summaryMap.get(simId)
        const simUrl = inserted!.find((r) => r.id === simId)?.url
        const simCategory = (simUrl ? validatedCategoryMap.get(simUrl) : null)
          ?? simSummary?.category
          ?? null

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
