// Claude Haiku 기사 관련성 검증 — PRD v3 Step 3
// 보험사 실무자 관점에서 유용한 기사만 통과
// 역할(Role) · 목적(Purpose) · 부합성(Alignment) 기준 적용

import Anthropic from '@anthropic-ai/sdk'
import type { Category } from '@/lib/keywords'

const client = new Anthropic()

const DELAY_MS = 500
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

export interface ValidationInput {
  title: string
  snippet: string        // sanitize 처리된 description
  suggestedCategory: Category  // 키워드 그룹에서 추정한 초기 카테고리
}

export interface ValidationResult {
  relevant: boolean
  reason: string         // 판단 이유 (로그용)
  category: Category     // 최종 카테고리 (Claude가 재분류)
}

// ── 검증 프롬프트 ──────────────────────────────────────────
// 역할 / 목적 / 부합성 기준 포함

function buildValidationPrompt(input: ValidationInput): string {
  return `당신은 보험사 내부 정보팀의 뉴스 큐레이터입니다.
아래 기사가 보험사 실무자에게 실질적으로 유용한 정보인지 판단해주세요.

---
## 독자 역할(Role)
이 뉴스레터를 구독하는 보험사 직원의 주요 역할:
- **언더라이터**: 신계약 인수심사, 리스크 평가, 보험사기 탐지
- **상품개발팀**: 신상품 기획, 경쟁사 상품 분석, 시장 니즈 파악
- **클레임팀**: 보험금 심사·지급, 손해사정, 민원·분쟁 처리
- **경영기획팀**: 시장 동향, 경영 전략, 경쟁사 동향 분석
- **리스크관리팀**: 자본 적정성(K-ICS), 회계기준(IFRS17), ALM 관리
- **규정준수팀**: 감독 규정, 법령 개정 사항 모니터링

## 독자 목적(Purpose)
이 직원들이 뉴스를 읽는 이유:
- 규제·감독 변화에 선제적으로 대응하기 위해
- 경쟁사 상품 및 전략을 파악하여 내부 전략에 반영하기 위해
- 시장 리스크(금리·사고율·의료비 등) 변화를 모니터링하기 위해
- 클레임·사기 트렌드를 파악하여 인수 기준에 반영하기 위해
- 업계 전반의 이슈를 파악하여 경영진에게 보고하기 위해

## 부합성 판단 기준(Alignment)
다음 조건 중 하나 이상을 만족하면 relevant: true:
✅ 보험 감독·규제·법령과 직접 관련된 내용
✅ 보험 상품(생명·손해·실손 등) 출시, 개정, 경쟁 현황
✅ 보험 인수심사, 보험사기, 리스크 관리 실무 정보
✅ 보험금 청구, 손해사정, 분쟁 관련 실무 동향
✅ 보험사의 재무·자본·경영 실적 및 전략
✅ 보험 시장 구조 변화, M&A, 신규 플레이어 진입

다음에 해당하면 relevant: false:
❌ 특정 보험 가입자 개인의 사건·사고 기사 (실무 활용 불가)
❌ 보험과 무관한 일반 금융·경제 기사 (주식, 부동산, 가상자산 등)
❌ 연예·스포츠·사회 기사 중 보험 언급이 부수적인 경우
❌ 단순 보험사 광고·홍보성 콘텐츠
❌ 보험과의 연관성이 제목·내용에서 명확하지 않은 기사

---
## 검토 기사
제목: ${input.title}
내용: ${input.snippet}
(초기 분류 카테고리: ${input.suggestedCategory})

---
## 카테고리 분류 기준
아래 6개 중 가장 적합한 하나를 선택:
- **업계동향**: 보험 산업 전반, 회사 경영, 시장 구조, M&A
- **상품**: 보험 상품 출시·개정, 보장 내용, 보험료 변화
- **언더라이팅**: 인수심사, 리스크 평가, 보험사기, 손해율
- **클레임**: 보험금 청구·지급, 손해사정, 민원·분쟁
- **정책**: 감독 규정, 법령 개정, IFRS17, K-ICS, 금감원 조치
- **기타**: 위에 해당하지 않는 보험 관련 기사

반드시 아래 JSON만 반환하고 다른 텍스트는 절대 포함하지 마세요:
{"relevant": true또는false, "reason": "판단이유 한줄(한국어)", "category": "카테고리명"}`
}

// ── 단건 검증 ─────────────────────────────────────────────

export async function validateArticle(input: ValidationInput): Promise<ValidationResult> {
  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{ role: 'user', content: buildValidationPrompt(input) }],
    })

    const text =
      response.content[0].type === 'text' ? response.content[0].text.trim() : '{}'

    // JSON 블록만 추출 (앞뒤 텍스트 방어)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('JSON 블록 없음')

    const parsed = JSON.parse(jsonMatch[0]) as {
      relevant: boolean
      reason: string
      category: string
    }

    const validCategories: Category[] = [
      '업계동향', '상품', '언더라이팅', '클레임', '정책', '기타',
    ]
    const category: Category = validCategories.includes(parsed.category as Category)
      ? (parsed.category as Category)
      : input.suggestedCategory

    return {
      relevant: Boolean(parsed.relevant),
      reason: parsed.reason ?? '',
      category,
    }
  } catch (e) {
    console.error('[validator] 파싱 실패:', e)
    // 실패 시 기본 통과 (잘못된 폐기 방지)
    return { relevant: true, reason: '검증 오류 — 기본 통과', category: input.suggestedCategory }
  }
}

// ── 배치 검증 (순차, 500ms delay) ────────────────────────

export interface ArticleToValidate {
  title: string
  snippet: string
  suggestedCategory: Category
}

export async function validateArticles<T extends ArticleToValidate>(
  articles: T[],
  maxResults: number,
): Promise<Array<T & { validatedCategory: Category }>> {
  const passed: Array<T & { validatedCategory: Category }> = []

  for (const article of articles) {
    if (passed.length >= maxResults) break

    const result = await validateArticle({
      title: article.title,
      snippet: article.snippet,
      suggestedCategory: article.suggestedCategory,
    })

    await delay(DELAY_MS)

    if (result.relevant) {
      passed.push({ ...article, validatedCategory: result.category })
      console.log(`[validator] ✓ ${article.title.slice(0, 40)} → ${result.category}`)
    } else {
      console.log(`[validator] ✗ ${article.title.slice(0, 40)} (${result.reason})`)
    }
  }

  return passed
}
