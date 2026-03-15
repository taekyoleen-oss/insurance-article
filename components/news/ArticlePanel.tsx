'use client'

import { useEffect, useState } from 'react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { ExternalLink, X } from 'lucide-react'
import type { NewsArticleWithSimilar, Category } from '@/types'
import { formatPublishedAt } from '@/lib/utils/date-kst'
import SimilarArticleItem from './SimilarArticleItem'

interface Props {
  article: NewsArticleWithSimilar | null
  onClose: () => void
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

function useWindowSize() {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    function update() {
      setWidth(window.innerWidth)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return width
}

function parseBullets(summary: string): string[] {
  return summary
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => l.replace(/^[•\-*]\s*/, ''))
}

export default function ArticlePanel({ article, onClose }: Props) {
  const width = useWindowSize()
  const isMobile = width > 0 && width < 640

  if (!article) return null

  const cat = article.category ?? '기타'
  const catColor = CATEGORY_COLORS[cat] ?? '#94A3B8'
  const catBg = CATEGORY_BG[cat] ?? 'rgba(148,163,184,0.15)'
  const href = article.naver_link ?? article.url
  const bullets = article.summary ? parseBullets(article.summary) : []

  return (
    <Sheet open={!!article} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={isMobile ? 'max-h-[90vh] overflow-y-auto' : 'w-[480px] overflow-y-auto'}
        style={{
          background: 'var(--ins-surface)',
          borderColor: 'var(--ins-border)',
          color: 'var(--ins-text)',
          padding: '0',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '16px 20px 0',
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--ins-text-muted)',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.875rem',
            }}
          >
            <X size={18} /> 닫기
          </button>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Meta */}
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
              <span style={{ fontSize: '0.8125rem', color: 'var(--ins-text-muted)' }}>{article.source}</span>
            )}
            {article.published_at && (
              <span style={{ fontSize: '0.8125rem', color: 'var(--ins-text-muted)', marginLeft: 'auto' }}>
                {formatPublishedAt(article.published_at)}
              </span>
            )}
          </div>

          {/* Title */}
          <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, lineHeight: 1.6, color: 'var(--ins-text)' }}>
            {article.title}
          </h2>

          {/* Link */}
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:underline"
            style={{
              fontSize: '0.875rem',
              color: 'var(--ins-accent)',
              fontWeight: 500,
            }}
          >
            <ExternalLink size={14} /> 원문 보기
          </a>

          <Separator style={{ background: 'var(--ins-border)' }} />

          {/* Summary */}
          <div>
            <p
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--ins-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '10px',
              }}
            >
              AI 요약
            </p>
            {article.summary ? (
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {bullets.map((b, i) => (
                  <li
                    key={i}
                    style={{
                      fontSize: '0.875rem',
                      color: 'var(--ins-text)',
                      lineHeight: 1.7,
                      paddingLeft: '16px',
                      position: 'relative',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        left: 0,
                        color: 'var(--ins-primary)',
                        fontWeight: 700,
                      }}
                    >
                      •
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
            ) : (
              <div>
                {article.snippet && (
                  <p style={{ fontSize: '0.875rem', color: 'var(--ins-text)', lineHeight: 1.7 }}>
                    {article.snippet}
                  </p>
                )}
                <p
                  style={{
                    fontSize: '0.8125rem',
                    color: 'var(--ins-text-muted)',
                    fontStyle: 'italic',
                    marginTop: '8px',
                  }}
                >
                  (요약 준비 중)
                </p>
              </div>
            )}
          </div>

          {/* Similar Articles */}
          {(article.similar_articles?.length ?? 0) > 0 && (
            <>
              <Separator style={{ background: 'var(--ins-border)' }} />
              <div>
                <p
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--ins-text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: '12px',
                  }}
                >
                  관련 기사 ({article.similar_articles.length})
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {article.similar_articles.map((sim) => (
                    <SimilarArticleItem key={sim.id} article={sim} />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
