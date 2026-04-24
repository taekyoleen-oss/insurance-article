// 보험 뉴스 검색 키워드 — PRD v3 (실무자 중심 보강)
// 카테고리: 업계동향 / 상품 / 언더라이팅 / 클레임 / 정책 / 기타

export type Category =
  | '업계동향'
  | '상품'
  | '언더라이팅'
  | '클레임'
  | '정책'
  | '기타'

export interface SearchKeyword {
  keyword: string
  category: Category
  display: number   // 네이버 API 요청 건수
}

export const SEARCH_KEYWORDS: SearchKeyword[] = [
  // 업계동향: 보험 산업 전반의 동향, 시장 변화, 경쟁사 동향
  { keyword: '보험업계',        category: '업계동향',   display: 7 },
  { keyword: '보험시장',        category: '업계동향',   display: 7 },
  { keyword: '재보험',          category: '업계동향',   display: 5 },

  // 상품: 신상품 출시, 보장 내용 변경, 경쟁 상품 분석 (실무자 핵심)
  { keyword: '보험 신상품',     category: '상품',       display: 8 },
  { keyword: '실손보험',        category: '상품',       display: 8 },
  { keyword: '보험료 조정',     category: '상품',       display: 6 },
  { keyword: '종신보험',        category: '상품',       display: 5 },

  // 언더라이팅: 인수심사·리스크 평가·가입한도·보험사기 (실무자 핵심)
  { keyword: '계약인수',        category: '언더라이팅', display: 8 },
  { keyword: '보험 인수심사',   category: '언더라이팅', display: 8 },
  { keyword: '보험 가입한도',   category: '언더라이팅', display: 6 },
  { keyword: '보험사기',        category: '언더라이팅', display: 8 },

  // 클레임: 보험금 청구·지급, 손해사정, 분쟁 처리
  { keyword: '보험금 청구',     category: '클레임',     display: 7 },
  { keyword: '손해사정',        category: '클레임',     display: 5 },
  { keyword: '보험금 분쟁',     category: '클레임',     display: 7 },

  // 정책: 감독·규제, 회계기준, 법령 변경
  { keyword: '금융감독원 보험', category: '정책',       display: 8 },
  { keyword: 'IFRS17',          category: '정책',       display: 5 },
  { keyword: 'K-ICS',           category: '정책',       display: 5 },
  { keyword: '보험업법',        category: '정책',       display: 5 },
]

export const CATEGORIES: Category[] = [
  '업계동향', '상품', '언더라이팅', '클레임', '정책', '기타',
]
