// ============================================================
// 보험 뉴스 대시보드 — 공용 타입 정의
// ============================================================

export type Category = '생명보험' | '손해보험' | '제도·규제' | '상품' | '기타'
export type Edition = '08:00' | '14:00'

// DB 테이블 row 타입
export interface NewsArticle {
  id: string
  title: string
  url: string
  naver_link: string | null
  summary: string | null        // null = 요약 준비 중
  summary_short: string | null
  snippet: string | null
  source: string | null
  published_at: string | null
  category: Category | null
  edition: Edition | null
  edition_date: string | null   // 'YYYY-MM-DD'
  cluster_id: string | null
  is_representative: boolean
  collected_at: string
}

// get_edition_articles RPC 반환 타입 (similar_articles 포함)
export interface NewsArticleWithSimilar extends NewsArticle {
  similar_articles: SimilarArticle[]
}

export interface SimilarArticle {
  id: string
  title: string
  url: string
  naver_link: string | null
  source: string | null
  published_at: string | null
  snippet: string | null
  summary_short: string | null
}

// /api/search 응답 타입 (DB 미사용, 네이버 API 프록시)
export interface SearchResult {
  title: string         // sanitize 처리 (HTML 태그 제거 + he.decode)
  link: string
  snippet: string       // sanitize 후 앞 100자 내외
  pubDate: string       // ISO 8601
  originallink: string
}

// /api/news 쿼리 파라미터
export interface NewsQueryParams {
  date: string          // 'YYYY-MM-DD' (KST)
  edition: Edition
  category?: Category
}

// /api/collect 응답
export interface CollectResult {
  collected: number     // 네이버 API에서 수집한 기사 수
  inserted: number      // DB에 신규 INSERT된 기사 수
  edition: Edition
  edition_date: string
}
