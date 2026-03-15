# 보험 뉴스 대시보드 — 에이전트 지침

> 설계서 전문: `insurance-news-dashboard-design.md`
> v1.0 범위: 뉴스 수집·요약·표시 + 사용자 검색
> **이메일 구독·발송 기능은 v2.0 이월 — v1.0에서 절대 구현하지 않음**

---

## 1. 프로젝트 개요

보험/보험상품 관련 뉴스를 네이버 뉴스 API로 하루 2회 자동 수집·AI 요약하여 카드형 웹페이지로 제공. 사용자가 키워드로 직접 검색도 가능.

### 두 가지 뉴스 흐름 — 항상 구분해서 처리

| 흐름 | 트리거 | DB 저장 | AI 처리 | UI |
|------|--------|---------|---------|-----|
| **정기 수집** | Vercel Cron (08:00 / 14:00 KST) | ✅ Supabase | ✅ Haiku 요약+클러스터링 | 카드 그리드 + 슬라이드 패널 |
| **사용자 검색** | 키워드 입력 → 검색 버튼 | ❌ 미저장 | ❌ 없음 | 리스트형 (제목+링크+snippet) |

---

## 2. 기술 스택

| 레이어 | 기술 | 버전 |
|--------|------|------|
| 프레임워크 | Next.js App Router | 15.x |
| UI 컴포넌트 | shadcn/ui (tweakcn.com 테마 적용) | latest |
| DB / Auth | Supabase | JS v2 |
| AI 요약 | Claude Haiku (Anthropic API) | claude-haiku-4-5-20251001 |
| 배포 | Vercel Pro 플랜 | — |
| 언어 | TypeScript (strict) | 5.x |
| 유효성 검사 | Zod | latest |

---

## 3. 스킬 참조 규칙

| 작업 | 참조 스킬 |
|------|----------|
| `/api/collect` 또는 `/api/search` 구현·수정 | `.claude/skills/news-collector/SKILL.md` 먼저 읽기 |
| 요약·클러스터링 로직 구현 또는 프롬프트 튜닝 | `.claude/skills/ai-summarizer/SKILL.md` 먼저 읽기 |
| Supabase 마이그레이션·RLS·타입 생성 | `~/.claude/skills/supabase-sync/SKILL.md` 먼저 읽기 |

**규칙**: 스킬 파일을 읽지 않고 해당 영역 코드를 작성하지 않는다.

---

## 4. 구현 순서 — 5단계 빌드 시퀀스

단계를 건너뛰지 않는다. 각 단계의 성공 기준을 확인한 후 다음 단계로 진행.

### Step 1 — 프로젝트 초기화 + Supabase 스키마
- Next.js 15 프로젝트 생성 (App Router, TypeScript, Tailwind)
- shadcn/ui 초기화
- `supabase/migrations/001_initial_schema.sql` 작성 및 적용
- `supabase gen types` 로 TypeScript 타입 생성
- **성공 기준**: 마이그레이션 오류 0건, 타입 파일 생성 성공

### Step 2 — 네이버 API 수집 엔진 (`/api/collect`)
- `.claude/skills/news-collector/SKILL.md` 참조
- 키워드별 fetch → HTML sanitize → URL 중복제거 → DB INSERT
- **성공 기준**: 기사 파싱 성공, DB INSERT 건수 > 0 확인

### Step 3 — Claude Haiku 요약 + 클러스터링
- `.claude/skills/ai-summarizer/SKILL.md` 참조
- Structured Output(JSON Schema) + Zod 검증
- **성공 기준**: summaries/clusters Zod 파싱 성공, cluster 관계 DB 저장 확인

### Step 4 — 프론트엔드 카드 UI + 슬라이드 패널
- ISR (`revalidate: 300`), 에디션 탭·카테고리 필터 (클라이언트 사이드)
- `ArticlePanel` — side="right" (md↑), side="bottom" + max-h-[90vh] (sm)
- **성공 기준**: `next build` 오류 0건, 패널 열림/닫힘 동작 확인

### Step 5 — 사용자 검색 기능 (`/api/search` + UI)
- 카드 그리드 **아래**에 검색 영역 배치 (의도적 순서)
- AbortController 1초 타임아웃
- **성공 기준**: 키워드 입력 → 결과 리스트 표시 확인

---

## 5. 코딩 컨벤션

### 일반
- `async/await` 사용, callback 패턴 금지
- 환경변수는 항상 `.env.local`, git 커밋 금지
- `service_role key`는 서버 컴포넌트 및 API Route 전용 (클라이언트 노출 금지)

### 파일 구조 원칙
- API Route: `app/api/{name}/route.ts`
- 서버 전용 로직: `lib/` (supabase/server.ts, collectors/, summarizer.ts 등)
- 클라이언트 컴포넌트: `components/news/`, `components/search/`
- 공용 타입: `types/index.ts`

### HTML 정제 (서버 레이어 필수)
```typescript
import he from 'he'
const sanitize = (s: string) => he.decode(s.replace(/<[^>]+>/g, ''))
```
네이버 API 응답의 `title`, `description` 필드는 반드시 위 함수로 정제 후 사용.

### KST 날짜 변환
```typescript
const toKSTDate = (date = new Date()) =>
  new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul',
    year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(date).replace(/\. /g, '-').replace('.', '')
```

### Supabase 조회
- 대표 기사 + 유사 기사 조회는 반드시 `.rpc('get_edition_articles', {...})` 사용
- 직접 LATERAL JOIN 쿼리를 클라이언트 코드에 작성하지 않는다

---

## 6. 환경 변수 목록

`.env.local.example` 기준:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
ANTHROPIC_API_KEY=
CRON_SECRET=
COLLECT_KEYWORDS=보험,보험료,보험상품,금감원 보험
```

- `COLLECT_KEYWORDS`: 쉼표 구분, 키워드당 10건 수집, 총 최대 40건
- `CRON_SECRET`: Vercel이 Cron 호출 시 `authorization: Bearer {CRON_SECRET}` 자동 주입 → API Route에서 검증

---

## 7. vercel.json

```json
{
  "crons": [
    { "path": "/api/collect?edition=0800", "schedule": "0 23 * * *" },
    { "path": "/api/collect?edition=1400", "schedule": "0 5 * * *" }
  ]
}
```

- `edition=0800` → 서버에서 `'08:00'` 매핑
- `edition=1400` → 서버에서 `'14:00'` 매핑
- UTC 23:00 = KST 08:00 / UTC 05:00 = KST 14:00

---

## 8. 성공 기준 체크리스트

### 정기 수집
- [ ] Cron 트리거 후 DB에 기사 INSERT 확인
- [ ] `summary` 3줄(•) 생성 확인
- [ ] `cluster_id` 관계 정합성 확인 (대표 기사 = 자기 id, 유사 기사 = 대표 id)
- [ ] 중복 URL UPSERT DO NOTHING 동작 확인

### 프론트엔드
- [ ] 오늘 날짜 최신 에디션 자동 선택 (14:00 우선)
- [ ] 14:00 데이터 없을 때 탭 disabled 처리
- [ ] DatePicker 최근 30일 제한
- [ ] 카드 클릭 → 슬라이드 패널 (우측/하단 반응형)
- [ ] summary=null 기사 → snippet + "요약 준비 중" 라벨

### 검색
- [ ] 1초 AbortController 타임아웃 동작
- [ ] 빈 키워드 입력 차단 (클라이언트 유효성 검사)
- [ ] 검색 결과 리스트 (AI 요약 없음, snippet만)

### 공통
- [ ] `next build` 오류 0건
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 클라이언트 번들 미포함 확인
- [ ] HTML 태그 미노출 확인 (sanitize 적용 여부)
