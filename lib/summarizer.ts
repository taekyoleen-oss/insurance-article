// Claude Haiku 요약 + 클러스터링 (1회 호출)
// SKILL: .claude/skills/ai-summarizer/SKILL.md 참조

import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

const client = new Anthropic()

// ── Zod 스키마 ──────────────────────────────────────────────

const CATEGORIES = ['업계동향', '상품', '언더라이팅', '클레임', '정책', '기타'] as const

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
  validatedCategory?: string   // 검증 단계에서 결정된 카테고리 (힌트로 전달)
}

// ── 폴백: 전체 기사를 단독 대표 기사로 처리 ─────────────────

export function fallbackClusters(articles: ArticleInput[]): ClusterItem[] {
  return articles.map((a) => ({ representative_id: a.id, similar_ids: [] }))
}

// ── 프롬프트 생성 ────────────────────────────────────────────

function buildPrompt(articles: ArticleInput[]): string {
  return `당신은 보험사 임직원을 위한 전문 뉴스 에디터입니다.
아래 기사 목록은 이미 보험사 실무 관련성 검증을 통과한 기사들입니다.

## 요약 원칙
각 기사에 대해 보험사 실무자(언더라이터·상품팀·클레임팀·경영기획·리스크관리)가
업무에 즉시 활용할 수 있도록 다음을 작성해 주세요:

1. **summary**: 글머리(•) 3줄, 줄당 한국어 40~60자
   - 1줄: 핵심 사실 (무엇이 변했는가/결정되었는가)
   - 2줄: 업무 영향 (보험사 실무에 어떤 영향이 있는가)
   - 3줄: 시사점 또는 후속 동향 (향후 주목할 점)
2. **summary_short**: 글머리(•) 1~2줄, 슬라이드 패널 유사 기사 표시용 축약
3. **category**: 아래 6개 중 하나 (validatedCategory 힌트 참고, 더 적합하면 변경 가능)
   - 업계동향: 산업 전반, 회사 경영, 시장 구조
   - 상품: 보험 상품 출시·개정, 보장 내용
   - 언더라이팅: 인수심사, 보험사기, 손해율
   - 클레임: 보험금 청구·지급, 손해사정, 민원
   - 정책: 감독 규정, 법령, IFRS17, K-ICS
   - 기타: 위에 해당하지 않는 보험 관련 기사

## 클러스터링 기준
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
                      enum: ['업계동향', '상품', '언더라이팅', '클레임', '정책', '기타'],
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
