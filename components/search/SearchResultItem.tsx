import type { SearchResult } from '@/types'
import { ExternalLink } from 'lucide-react'

interface Props {
  result: SearchResult
}

function formatPubDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export default function SearchResultItem({ result }: Props) {
  const href = result.link || result.originallink

  return (
    <div style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-start gap-1 hover:underline group"
        style={{ color: 'var(--ins-text)', fontWeight: 600, fontSize: '0.9375rem', lineHeight: 1.5 }}
      >
        <span>{result.title}</span>
        <ExternalLink
          size={14}
          style={{ color: 'var(--ins-accent)', marginTop: '3px', flexShrink: 0 }}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        />
      </a>
      {result.pubDate && (
        <span style={{ fontSize: '0.75rem', color: 'var(--ins-text-muted)' }}>
          {formatPubDate(result.pubDate)}
        </span>
      )}
      {result.snippet && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--ins-text-muted)', lineHeight: 1.6 }}>
          {result.snippet}
        </p>
      )}
    </div>
  )
}
