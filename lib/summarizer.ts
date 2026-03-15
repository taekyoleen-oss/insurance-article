// Claude Haiku 요약 + 클러스터링 (1회 호출)
// SKILL: .claude/skills/ai-summarizer/SKILL.md 참조

import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

const client = new Anthropic()

// ── Zod 스키마 ──────────────────────────────────────────────

const CATEGORIES = ['생명보험', '손해보험', '제도·규제', '상품', '기타'] as const

const SummaryItemSchema = z.object({
  id: z.string(),
  summary: z.string(),
  summary_short: z.string(),
  category: z.enum(CATEGORIES),
})

const ClusterItemSchema = z.object({
  representative_id: z.string(),
  similar_ids: z.array(z.string()),
})

export const HaikuOutputSchema = z.object({
  summaries: z.array(SummaryItemSchema),
  clusters: z.array(ClusterItemSchema),
})

export type HaikuOutput = z.infer<typeof HaikuOutputSchema>
export type SummaryItem = z.infer<typeof SummaryItemSchema>
export type ClusterItem = z.infer<typeof ClusterItemSchema>

// ── 입력 타입 ────────────────────────────────────────────────

export interface ArticleInput {
  id: string
  title: string
  source: string
  snippet: string
}

// ── 폴백: 전체 기사를 단독 대표 기사로 처리 ─────────────────

export function fallbackClusters(articles: ArticleInput[]): ClusterItem[] {
  return articles.map((a) => ({ representative_id: a.id, similar_ids: [] }))
}

// ── 프롬프트 생성 ────────────────────────────────────────────

function buildPrompt(articles: ArticleInput[]): string {
  return `다음은 이번 에디션의 보험 뉴스 기사 목록입니다.

각 기사에 대해:
1. **summary**: 글머리(•) 3개, 줄당 한국어 40~60자로 핵심 내용 요약
2. **summary_short**: 글머리(•) 1~2줄 축약 (슬라이드 패널 유사 기사 표시용)
3. **category**: 생명보험 / 손해보험 / 제도·규제 / 상품 / 기타 중 하나

클러스터링 기준:
- 제목 + snippet 기준 주제 유사도 80% 이상이면 같은 클러스터
- 동일 법령 개정, 동일 사건의 다른 매체 보도는 유사로 판단
- 대표 기사 선정 우선순위: 신뢰도 높은 출처 > 정보량 > 입력 순서
- 모든 기사는 반드시 하나의 클러스터에 속해야 함 (similar_ids=[] 허용)
- similar_ids는 최대 2개

기사 목록:
${JSON.stringify(articles, null, 2)}`
}

// ── Haiku 1회 호출 ───────────────────────────────────────────

export async function processArticles(articles: ArticleInput[]): Promise<HaikuOutput | null> {
  if (articles.length === 0) return null

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 16000,
      tools: [
        {
          name: 'process_insurance_news',
          description: '보험 뉴스 기사를 요약·분류·클러스터링한다',
          input_schema: {
            type: 'object' as const,
            properties: {
              summaries: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    summary: { type: 'string' },
                    summary_short: { type: 'string' },
                    category: {
                      type: 'string',
                      enum: ['생명보험', '손해보험', '제도·규제', '상품', '기타'],
                    },
                  },
                  required: ['id', 'summary', 'summary_short', 'category'],
                },
              },
              clusters: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    representative_id: { type: 'string' },
                    similar_ids: { type: 'array', items: { type: 'string' } },
                  },
                  required: ['representative_id', 'similar_ids'],
                },
              },
            },
            required: ['summaries', 'clusters'],
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'process_insurance_news' },
      messages: [{ role: 'user', content: buildPrompt(articles) }],
    })

    const toolUse = response.content.find((b) => b.type === 'tool_use')
    if (!toolUse || toolUse.type !== 'tool_use') {
      console.error('[summarizer] tool_use 블록 없음')
      return null
    }

    const parsed = HaikuOutputSchema.safeParse(toolUse.input)
    if (!parsed.success) {
      console.error('[summarizer] Zod 검증 실패:', parsed.error.flatten())
      return null
    }

    return parsed.data
  } catch (e) {
    console.error('[summarizer] Haiku 호출 실패:', e)
    return null
  }
}
