# 스킬: ai-summarizer

> **트리거**: 요약·클러스터링 로직 구현 또는 프롬프트 튜닝 시 이 파일을 먼저 읽는다.
> **역할**: Claude Haiku로 기사 요약 + 카테고리 분류 + 유사 기사 클러스터링 (1회 호출)

---

## 1. 핵심 원칙

- **1회 호출**: summaries 배열 + clusters 배열을 단일 API 호출로 동시 출력
- **Structured Output**: Anthropic API의 JSON Schema 기능 사용 → 파싱 실패 없음
- **Zod 검증**: 응답을 Zod 스키마로 검증 후 사용 (타입 안전성 보장)
- **모델**: `claude-haiku-4-5-20251001`

---

## 2. 입력 형식

```typescript
interface ArticleInput {
  id: string       // UUID (DB에서 미리 INSERT 후 생성된 id)
  title: string    // sanitize 처리된 제목
  source: string   // 출처명
  snippet: string  // sanitize 처리된 snippet
}
```

신규 기사 목록 (`ArticleInput[]`)을 JSON 직렬화하여 user 메시지로 전달.

---

## 3. Zod 스키마 정의

```typescript
import { z } from 'zod'

const CATEGORIES = ['생명보험', '손해보험', '제도·규제', '상품', '기타'] as const

const SummaryItemSchema = z.object({
  id: z.string().uuid(),
  summary: z.string(),        // "• 줄1\n• 줄2\n• 줄3" 형식
  summary_short: z.string(),  // "• 축약 1~2줄" 형식
  category: z.enum(CATEGORIES),
})

const ClusterItemSchema = z.object({
  representative_id: z.string().uuid(),
  similar_ids: z.array(z.string().uuid()),  // 없으면 []
})

export const HaikuOutputSchema = z.object({
  summaries: z.array(SummaryItemSchema),
  clusters: z.array(ClusterItemSchema),
})

export type HaikuOutput = z.infer<typeof HaikuOutputSchema>
```

---

## 4. Anthropic API 호출 (Structured Output)

```typescript
import Anthropic from '@anthropic-ai/sdk'
import { HaikuOutputSchema } from './schema'

const client = new Anthropic()

export async function processArticles(articles: ArticleInput[]): Promise<HaikuOutput | null> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
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
    messages: [
      {
        role: 'user',
        content: buildPrompt(articles),
      },
    ],
  })

  const toolUse = response.content.find(b => b.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') return null

  const parsed = HaikuOutputSchema.safeParse(toolUse.input)
  if (!parsed.success) {
    console.error('[ai-summarizer] Zod 검증 실패:', parsed.error)
    return null
  }
  return parsed.data
}
```

---

## 5. 시스템 프롬프트 / 사용자 프롬프트

```typescript
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
```

---

## 6. 폴백 처리

### 요약 실패 시
```typescript
// processArticles가 null 반환 또는 특정 기사 summary가 없을 때
// → summary=null, summary_short=null로 DB 저장
// → 클라이언트에서 snippet 표시 + "요약 준비 중" 라벨
```

### 클러스터링 실패 시 (Zod 검증 실패 포함)
```typescript
// HaikuOutput이 null이거나 clusters가 비정상일 때
// → 에디션의 모든 기사를 단독 대표 기사로 처리
function fallbackClusters(articles: ArticleInput[]): ClusterItem[] {
  return articles.map(a => ({ representative_id: a.id, similar_ids: [] }))
}
```

---

## 7. DB 저장 로직

Haiku 출력 → DB 저장 변환:

```typescript
// clusters 기반으로 is_representative, cluster_id 결정
for (const cluster of clusters) {
  const repId = cluster.representative_id
  // 대표 기사: cluster_id = 자기 id, is_representative = true
  await upsertArticle(repId, { cluster_id: repId, is_representative: true, ...summaryOf(repId) })

  // 유사 기사: cluster_id = 대표 기사 id, is_representative = false
  for (const simId of cluster.similar_ids) {
    await upsertArticle(simId, { cluster_id: repId, is_representative: false, ...summaryOf(simId) })
  }
}
```

---

## 8. 비용 최적화 주의사항

- Haiku 호출은 **정기 수집(Cron) 기사에만** 적용
- 사용자 검색 결과(`/api/search`)에는 절대 호출하지 않음
- 에디션당 최대 40건 입력 → 1회 호출로 처리 (배치 분할 불필요)
- `max_tokens: 16000` 사용 — 40건 × 기사당 ~200토큰 = ~8000토큰 필요, 4096으로는 부족해서 Zod 파싱 실패 발생
