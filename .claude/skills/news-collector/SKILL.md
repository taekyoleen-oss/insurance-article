# 스킬: news-collector

> **트리거**: `/api/collect` 또는 `/api/search` 구현·수정 시 이 파일을 먼저 읽는다.
> **역할**: 네이버 뉴스 검색 API 호출, 응답 파싱, HTML 정제, URL 중복 제거

---

## 1. 네이버 뉴스 검색 API 기본 정보

```
GET https://openapi.naver.com/v1/search/news.json
  ?query={keyword}
  &display=10          ← 키워드당 10건 (설계서 확정)
  &sort=date

Headers:
  X-Naver-Client-Id: {NAVER_CLIENT_ID}
  X-Naver-Client-Secret: {NAVER_CLIENT_SECRET}
```

### 응답 필드 매핑

| 네이버 API 필드 | 내부 처리 | 비고 |
|----------------|----------|------|
| `title` | sanitize 후 `title` | HTML 태그 포함 |
| `originallink` | `url` (UNIQUE 키) | 없으면 `link` 폴백 |
| `link` | `naver_link` | 네이버 뉴스 URL 보조 저장 |
| `description` | sanitize 후 `snippet` | snippet 앞 100자 내외로 자르기 |
| `pubDate` | `new Date(pubDate).toISOString()` | `published_at` 저장 |

---

## 2. HTML 정제 (필수)

`he` 패키지 사용:

```typescript
import he from 'he'

export const sanitize = (raw: string): string =>
  he.decode(raw.replace(/<[^>]+>/g, '').trim())
```

네이버 API의 `title`, `description`은 `&amp;`, `<b>` 등 HTML 엔티티/태그가 포함되어 있다.
**반드시 sanitize 후 DB 저장 및 클라이언트 전달.**

---

## 3. URL UNIQUE 키 결정 로직

```typescript
const resolveUrl = (item: NaverNewsItem): string =>
  item.originallink?.trim() || item.link
```

- `originallink`가 있으면 그것을 `url` 컬럼에 저장 (UNIQUE 제약 대상)
- `link` (naver.me URL)는 `naver_link` 컬럼에 보조 저장

---

## 4. 키워드 관리

```typescript
const keywords = (process.env.COLLECT_KEYWORDS ?? '보험,보험료,보험상품,금감원 보험')
  .split(',')
  .map(k => k.trim())
  .filter(Boolean)
```

- 환경변수 `COLLECT_KEYWORDS`로 런타임 교체 가능
- 키워드당 `display=10` → 최대 4개 키워드 × 10건 = 총 40건

---

## 5. 수집 흐름 (`/api/collect`)

```
1. Cron 인증 검증
   → req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`
   → 불일치 시 401 반환

2. edition 파라미터 파싱
   → ?edition=0800 → '08:00'
   → ?edition=1400 → '14:00'
   → 미일치 시 400 반환

3. KST edition_date 계산
   → Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul' })

4. 키워드별 네이버 API 호출 (순차, 429 시 지수 백오프)
   → 1차 실패: 1s 대기 재시도
   → 2차 실패: 2s 대기 재시도
   → 3차 실패: 해당 키워드 건너뜀, 계속 진행

5. URL 중복 제거 (Supabase 배치 조회)
   → 수집된 URL 목록을 한 번에 Supabase에 조회
   → 이미 존재하는 URL 제외 → 신규 URL만 추출
   → 신규 기사만 Haiku에 전달

6. 신규 기사 Haiku 처리 (.claude/skills/ai-summarizer/SKILL.md 참조)

7. Supabase INSERT
   → ON CONFLICT (url) DO NOTHING
```

---

## 6. 실시간 검색 흐름 (`/api/search`)

```typescript
// GET /api/search?q={keyword}
// 1. q 파라미터 유효성 검사 (빈 문자열 → 400)
// 2. 네이버 뉴스 API 호출 (display=10, sort=date)
// 3. 응답 sanitize 후 SearchResult[] 반환
// 4. DB 저장 없음
```

응답 형식:
```typescript
interface SearchResult {
  title: string        // sanitize 처리
  link: string
  snippet: string      // sanitize 후 앞 100자 내외
  pubDate: string      // new Date(pubDate).toISOString()
  originallink: string
}
```

---

## 7. 출처명(source) 추출

네이버 뉴스 API는 출처명을 직접 제공하지 않는다. URL에서 추출:

```typescript
export const extractSource = (url: string): string => {
  try {
    const hostname = new URL(url).hostname.replace('www.', '')
    const known: Record<string, string> = {
      'yna.co.kr': '연합뉴스',
      'hankyung.com': '한국경제',
      'mk.co.kr': '매일경제',
      'chosun.com': '조선일보',
      'joins.com': '중앙일보',
      'donga.com': '동아일보',
      'newsis.com': '뉴시스',
      'news1.kr': '뉴스1',
      'fnnews.com': '파이낸셜뉴스',
    }
    return known[hostname] ?? hostname
  } catch {
    return '알 수 없음'
  }
}
```

---

## 8. 주요 주의사항

- 네이버 API 일 25,000건 무료 한도 — 수집은 하루 2회 × 최대 40건으로 충분
- `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`는 서버 전용 (NEXT_PUBLIC_ 접두어 금지)
- `/api/collect`는 `CRON_SECRET` 헤더 검증 필수 — 없으면 누구나 호출 가능
- `sanitize`를 빠뜨리면 카드 UI에 `<b>`, `&amp;` 등이 노출됨
