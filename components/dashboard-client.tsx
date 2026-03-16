'use client'

import { useState, useEffect } from 'react'
import type { NewsArticleWithSimilar, Edition, Category } from '@/types'
import type { DateWithEditions } from '@/lib/supabase/queries'
import { Newspaper, Sun, Moon } from 'lucide-react'
import DateSidebar from '@/components/news/DateSidebar'
import CategoryFilter from '@/components/news/CategoryFilter'
import NewsGrid from '@/components/news/NewsGrid'
import LoadingSkeleton from '@/components/news/LoadingSkeleton'
import ArticlePanel from '@/components/news/ArticlePanel'
import SearchSection from '@/components/search/SearchSection'
import VibeCodingLabBanner from '@/components/VibeCodingLabBanner'

interface Props {
  initialArticles: NewsArticleWithSimilar[]
  initialDate: string
  initialEdition: Edition | null
  allDates: DateWithEditions[]
}

export default function DashboardClient({
  initialArticles,
  initialDate,
  initialEdition,
  allDates: initialAllDates,
}: Props) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const saved = localStorage.getItem('ins-theme') as 'dark' | 'light' | null
    const initial = saved ?? 'dark'
    setTheme(initial)
    document.documentElement.setAttribute('data-theme', initial)
  }, [])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('ins-theme', next)
  }

  const [articles, setArticles] = useState<NewsArticleWithSimilar[]>(initialArticles)
  const [selectedDate, setSelectedDate] = useState<string>(initialDate)
  const [selectedEdition, setSelectedEdition] = useState<Edition | null>(initialEdition)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [allDates, setAllDates] = useState<DateWithEditions[]>(initialAllDates)
  const [loading, setLoading] = useState(false)
  const [openArticle, setOpenArticle] = useState<NewsArticleWithSimilar | null>(null)

  const filteredArticles = articles.filter(
    (a) => !selectedCategory || a.category === selectedCategory,
  )

  async function handleSidebarSelect(date: string, edition: Edition) {
    if (date === selectedDate && edition === selectedEdition) return
    setSelectedDate(date)
    setSelectedEdition(edition)
    setSelectedCategory(null)
    setLoading(true)
    try {
      const res = await fetch(
        `/api/news?date=${encodeURIComponent(date)}&edition=${encodeURIComponent(edition)}`,
      )
      if (!res.ok) throw new Error('Failed')
      const json = await res.json()
      setArticles(json.articles ?? [])
    } catch {
      setArticles([])
    } finally {
      setLoading(false)
    }
  }

  // 새 수집 후 사이드바 날짜 목록 갱신 (옵션)
  async function refreshAllDates() {
    try {
      const res = await fetch('/api/dates')
      if (res.ok) {
        const json = await res.json()
        setAllDates(json.dates ?? [])
      }
    } catch { /* silent */ }
  }
  void refreshAllDates  // suppress unused warning — called only when needed

  // 선택 날짜의 에디션 레이블
  const editionLabel = selectedEdition === '08:00' ? '오전 08:00' : selectedEdition === '14:00' ? '오후 14:00' : ''

  return (
    <div style={{ background: 'var(--ins-bg)', minHeight: '100vh', color: 'var(--ins-text)' }}>
      {/* ── Header ───────────────────────────────────────────── */}
      <header
        style={{
          borderBottom: '1px solid var(--ins-border)',
          background: 'var(--ins-surface)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: '100%',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <Newspaper size={20} style={{ color: 'var(--ins-primary)', flexShrink: 0 }} />
          <h1
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              color: 'var(--ins-text)',
              letterSpacing: '-0.01em',
              flexShrink: 0,
            }}
          >
            보험 뉴스 대시보드
          </h1>
          {selectedDate && selectedEdition && (
            <span
              style={{
                fontSize: '0.8125rem',
                color: 'var(--ins-text-muted)',
                marginLeft: '4px',
              }}
            >
              {selectedDate} · {editionLabel}
            </span>
          )}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
            style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '9999px',
              border: '1px solid var(--ins-border)',
              background: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
              color: 'var(--ins-text-muted)',
              cursor: 'pointer',
              fontSize: '0.8125rem',
              fontWeight: 500,
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            {theme === 'dark'
              ? <><Sun size={14} style={{ color: '#F59E0B' }} /> 라이트</>
              : <><Moon size={14} style={{ color: '#6366F1' }} /> 다크</>
            }
          </button>
        </div>
      </header>

      {/* ── Body: sidebar + main ─────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        {/* Left Sidebar */}
        <DateSidebar
          dates={allDates}
          selectedDate={selectedDate}
          selectedEdition={selectedEdition}
          onSelect={handleSidebarSelect}
        />

        {/* Main Content */}
        <main style={{ flex: 1, minWidth: 0, maxWidth: '1200px' }}>
          {/* Category Filter */}
          <CategoryFilter
            selected={selectedCategory}
            onChange={setSelectedCategory}
            articles={articles}
          />

          {/* News Grid or Skeleton */}
          {loading ? (
            <LoadingSkeleton />
          ) : (
            <NewsGrid articles={filteredArticles} onCardClick={setOpenArticle} />
          )}

          {/* Search Section */}
          <SearchSection />

          {/* Promo Footer */}
          <VibeCodingLabBanner />
        </main>
      </div>

      {/* Article Side Panel */}
      <ArticlePanel article={openArticle} onClose={() => setOpenArticle(null)} />
    </div>
  )
}
