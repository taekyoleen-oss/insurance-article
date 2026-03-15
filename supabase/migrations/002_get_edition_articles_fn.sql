-- get_edition_articles 함수 생성 (LATERAL JOIN 캡슐화)
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
    a.id, a.title, a.url, a.naver_link, a.summary, a.summary_short,
    a.snippet, a.source, a.published_at, a.category, a.edition,
    a.edition_date, a.cluster_id, a.is_representative, a.collected_at,
    COALESCE(json_agg(
      json_build_object(
        'id',            s.id,
        'title',         s.title,
        'url',           s.url,
        'naver_link',    s.naver_link,
        'source',        s.source,
        'published_at',  s.published_at,
        'snippet',       s.snippet,
        'summary_short', s.summary_short
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
