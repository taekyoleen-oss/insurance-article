-- ============================================================
-- 보험 뉴스 대시보드 — 초기 스키마
-- 설계서 §3 데이터 모델 기준
-- ============================================================

-- ins_news_articles
CREATE TABLE IF NOT EXISTS ins_news_articles (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title             text        NOT NULL,
  url               text        UNIQUE NOT NULL,   -- originallink 우선, 없으면 link 폴백
  naver_link        text,                          -- 네이버 뉴스 URL 보조 저장 (link 필드)
  summary           text,                          -- Claude Haiku 3줄 요약 (null = 요약 준비 중)
  summary_short     text,                          -- 유사 기사 패널 내 1~2줄 축약
  snippet           text,                          -- 네이버 API 원본 snippet (AI 미가공)
  source            text,                          -- 출처명 (e.g. '연합뉴스', '한국경제')
  published_at      timestamptz,
  category          text CHECK (category IN ('생명보험', '손해보험', '제도·규제', '상품', '기타')),
  edition           text CHECK (edition IN ('08:00', '14:00')),
  edition_date      date,                          -- KST 발간 날짜
  cluster_id        uuid REFERENCES ins_news_articles(id) ON DELETE CASCADE,
  is_representative boolean     DEFAULT true,      -- true=대표 기사, false=유사 기사
  collected_at      timestamptz DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_ins_articles_edition
  ON ins_news_articles (edition_date DESC, edition);

CREATE INDEX IF NOT EXISTS idx_ins_articles_category
  ON ins_news_articles (category);

CREATE INDEX IF NOT EXISTS idx_ins_articles_representative
  ON ins_news_articles (is_representative, edition_date DESC);

CREATE INDEX IF NOT EXISTS idx_ins_articles_cluster
  ON ins_news_articles (cluster_id)
  WHERE is_representative = false;

-- RLS 활성화
ALTER TABLE ins_news_articles ENABLE ROW LEVEL SECURITY;

-- 읽기 공개
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ins_news_articles' AND policyname = 'ins_articles_select_public'
  ) THEN
    CREATE POLICY "ins_articles_select_public"
      ON ins_news_articles FOR SELECT
      USING (true);
  END IF;
END $$;

-- INSERT/UPDATE/DELETE: service_role 전용
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ins_news_articles' AND policyname = 'ins_articles_write_service_role'
  ) THEN
    CREATE POLICY "ins_articles_write_service_role"
      ON ins_news_articles FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ============================================================
-- PostgreSQL 함수: get_edition_articles
-- LATERAL JOIN 캡슐화 → /api/news에서 .rpc() 로 호출
-- ============================================================
CREATE OR REPLACE FUNCTION get_edition_articles(
  p_edition_date date,
  p_edition      text,
  p_category     text DEFAULT NULL
)
RETURNS TABLE (
  id                uuid,
  title             text,
  url               text,
  naver_link        text,
  summary           text,
  summary_short     text,
  snippet           text,
  source            text,
  published_at      timestamptz,
  category          text,
  edition           text,
  edition_date      date,
  cluster_id        uuid,
  is_representative boolean,
  collected_at      timestamptz,
  similar_articles  json
)
LANGUAGE sql STABLE AS $$
  SELECT
    a.id,
    a.title,
    a.url,
    a.naver_link,
    a.summary,
    a.summary_short,
    a.snippet,
    a.source,
    a.published_at,
    a.category,
    a.edition,
    a.edition_date,
    a.cluster_id,
    a.is_representative,
    a.collected_at,
    COALESCE(json_agg(
      json_build_object(
        'id',           s.id,
        'title',        s.title,
        'url',          s.url,
        'naver_link',   s.naver_link,
        'source',       s.source,
        'published_at', s.published_at,
        'snippet',      s.snippet,
        'summary_short',s.summary_short
      )
    ) FILTER (WHERE s.id IS NOT NULL), '[]'::json) AS similar_articles
  FROM ins_news_articles a
  LEFT JOIN LATERAL (
    SELECT id, title, url, naver_link, source, published_at, snippet, summary_short
    FROM ins_news_articles
    WHERE cluster_id = a.id
      AND is_representative = false
    ORDER BY collected_at ASC
    LIMIT 2
  ) s ON true
  WHERE a.is_representative = true
    AND a.edition_date = p_edition_date
    AND a.edition = p_edition
    AND (p_category IS NULL OR a.category = p_category)
  GROUP BY a.id
  ORDER BY a.published_at DESC
  LIMIT 20;
$$;
