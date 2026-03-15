'use client'

import { useState, useRef } from 'react'
import { Search } from 'lucide-react'
import type { SearchResult } from '@/types'
import SearchResultList from './SearchResultList'

export default function SearchSection() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  async function handleSearch() {
    const q = query.trim()
    if (!q) return

    if (abortRef.current) {
      abortRef.current.abort()
    }

    const controller = new AbortController()
    abortRef.current = controller
    const timer = setTimeout(() => controller.abort(), 1000)

    setLoading(true)
    setError(null)
    setResults(null)

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
        signal: controller.signal,
      })
      clearTimeout(timer)

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? '검색에 실패했습니다')
      }

      const json = await res.json()
      setResults(json.results ?? [])
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') {
        setError('검색 시간이 초과되었습니다')
      } else {
        setError(e instanceof Error ? e.message : '검색에 실패했습니다')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <section
      style={{
        background: 'var(--ins-search-bg)',
        borderTop: '1px solid var(--ins-border)',
        padding: '32px 24px',
        marginTop: '16px',
      }}
    >
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <h3
          style={{
            fontSize: '1.0625rem',
            fontWeight: 700,
            color: 'var(--ins-text)',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Search size={18} style={{ color: 'var(--ins-primary)' }} />
          보험 뉴스 검색
        </h3>

        {/* Input row */}
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
            placeholder="키워드를 입력하세요 (예: 실손보험, 생명보험사)"
            style={{
              flex: 1,
              background: 'var(--ins-surface-alt)',
              border: '1px solid var(--ins-border)',
              borderRadius: '8px',
              color: 'var(--ins-text)',
              padding: '10px 14px',
              fontSize: '0.875rem',
              outline: 'none',
            }}
          />
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            style={{
              background: loading || !query.trim() ? 'rgba(245,158,11,0.4)' : 'var(--ins-primary)',
              color: 'var(--ins-primary-fg)',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: loading || !query.trim() ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            {loading ? (
              <>
                <span
                  style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid var(--ins-primary-fg)',
                    borderTopColor: 'transparent',
                    borderRadius: '9999px',
                    display: 'inline-block',
                    animation: 'spin 0.7s linear infinite',
                  }}
                />
                검색 중
              </>
            ) : (
              <>
                <Search size={14} />
                검색
              </>
            )}
          </button>
        </div>

        {/* Results */}
        {error && (
          <p style={{ fontSize: '0.875rem', color: '#FB7185', marginTop: '12px' }}>{error}</p>
        )}

        {results !== null && !loading && (
          <div style={{ marginTop: '20px' }}>
            <SearchResultList results={results} />
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </section>
  )
}
