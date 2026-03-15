-- PRD v3: 카테고리 체계 변경
-- 구버전: 생명보험 / 손해보험 / 제도·규제 / 상품 / 기타
-- 신버전: 업계동향 / 상품 / 언더라이팅 / 클레임 / 정책 / 기타

-- 기존 check 제약조건 제거
ALTER TABLE ins_news_articles
  DROP CONSTRAINT IF EXISTS ins_news_articles_category_check;

-- 새 카테고리 체계로 check 제약조건 재설정
ALTER TABLE ins_news_articles
  ADD CONSTRAINT ins_news_articles_category_check
  CHECK (category IN ('업계동향', '상품', '언더라이팅', '클레임', '정책', '기타'));
