import type { SimilarArticle } from '@/types'
import { ExternalLink } from 'lucide-react'
import { formatPublishedAt } from '@/lib/utils/date-kst'

interface Props {
  article: SimilarArticle
}

export default function SimilarArticleItem({ article }: Props) {
  const href = article.naver_link ?? article.url

  return (
    <div
      style={{
        padding: '12px',
        borderRadius: '8px',
        background: 'var(--ins-surface-alt)',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      <div className="flex items-start gap-2">
        <span style={{ fontSize: '0.875rem', color: 'var(--ins-text-muted)', marginTop: '2px' }}>📄</span>
        <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--ins-text)', lineHeight: 1.5 }}>
          {article.title}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-wrap" style={{ paddingLeft: '22px' }}>
        {article.source && (
          <span style={{ fontSize: '0.75rem', color: 'var(--ins-text-muted)' }}>{article.source}</span>
        )}
        {article.published_at && (
          <>
            <span style={{ fontSize: '0.75rem', color: 'var(--ins-text-muted)' }}>·</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--ins-text-muted)' }}>
              {formatPublishedAt(article.published_at)}
            </span>
          </>
        )}
      </div>
      <div style={{ paddingLeft: '22px' }}>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 hover:underline"
          style={{ fontSize: '0.75rem', color: 'var(--ins-accent)' }}
        >
          원문 보기 <ExternalLink size={12} />
        </a>
      </div>
      {(article.summary_short ?? article.snippet) && (
        <p
          style={{
            fontSize: '0.8125rem',
            color: 'var(--ins-text-muted)',
            lineHeight: 1.6,
            paddingLeft: '22px',
          }}
        >
          {article.summary_short ?? article.snippet}
        </p>
      )}
    </div>
  )
}
