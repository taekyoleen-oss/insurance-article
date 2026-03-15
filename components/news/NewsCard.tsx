'use client'

import type { NewsArticleWithSimilar, Category } from '@/types'
import { formatPublishedAt } from '@/lib/utils/date-kst'
import SimilarCountBadge from './SimilarCountBadge'

interface Props {
  article: NewsArticleWithSimilar
  onClick: () => void
}

const CATEGORY_COLORS: Record<string, string> = {
  '생명보험': '#F59E0B',
  '손해보험': '#38BDF8',
  '제도·규제': '#FB7185',
  '상품': '#34D399',
  '기타': '#94A3B8',
}

const CATEGORY_BG: Record<string, string> = {
  '생명보험': 'rgba(245,158,11,0.15)',
  '손해보험': 'rgba(56,189,248,0.15)',
  '제도·규제': 'rgba(251,113,133,0.15)',
  '상품': 'rgba(52,211,153,0.15)',
  '기타': 'rgba(148,163,184,0.15)',
}

function getFirstBullet(summary: string): string {
  const lines = summary.split('\n').map((l) => l.trim()).filter(Boolean)
  const bullet = lines.find((l) => l.startsWith('•') || l.startsWith('-') || l.startsWith('*'))
  if (bullet) return bullet.replace(/^[•\-*]\s*/, '')
  return lines[0] ?? ''
}

export default function NewsCard({ article, onClick }: Props) {
  const cat = article.category ?? '기타'
  const catColor = CATEGORY_COLORS[cat] ?? '#94A3B8'
  const catBg = CATEGORY_BG[cat] ?? 'rgba(148,163,184,0.15)'

  const summaryLine = article.summary
    ? getFirstBullet(article.summary)
    : article.snippet
    ? article.snippet.slice(0, 60)
    : ''

  const showPending = !article.summary

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--ins-surface)',
        border: '1px solid var(--ins-border)',
        borderRadius: '12px',
        padding: '16px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
      className="hover:scale-[1.01] hover:border-[var(--ins-accent)]"
    >
      {/* Top row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          style={{
            padding: '2px 8px',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            background: catBg,
            color: catColor,
          }}
        >
          {cat}
        </span>
        {article.source && (
          <span style={{ fontSize: '0.75rem', color: 'var(--ins-text-muted)' }}>
            {article.source}
          </span>
        )}
        {article.published_at && (
          <span style={{ fontSize: '0.75rem', color: 'var(--ins-text-muted)', marginLeft: 'auto' }}>
            {formatPublishedAt(article.published_at)}
          </span>
        )}
      </div>

      {/* Title */}
      <h2
        style={{
          fontSize: '0.9375rem',
          fontWeight: 600,
          color: 'var(--ins-text)',
          lineHeight: 1.5,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {article.title}
      </h2>

      {/* Summary line */}
      <p
        style={{
          fontSize: '0.8125rem',
          color: 'var(--ins-text-muted)',
          lineHeight: 1.6,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {summaryLine && `• ${summaryLine}`}
        {showPending && (
          <span style={{ color: 'var(--ins-text-muted)', fontStyle: 'italic' }}>
            {summaryLine ? ' ' : ''}(요약 준비 중)
          </span>
        )}
      </p>

      {/* Footer */}
      {(article.similar_articles?.length ?? 0) > 0 && (
        <div className="flex items-center gap-2 mt-auto pt-1">
          <SimilarCountBadge count={article.similar_articles.length} />
        </div>
      )}
    </div>
  )
}
