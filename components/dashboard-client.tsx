'use client'

import { useState } from 'react'
import type { NewsArticleWithSimilar, Edition, Category } from '@/types'
import type { DateWithEditions } from '@/lib/supabase/queries'
import { Newspaper } from 'lucide-react'
import DateSidebar from '@/components/news/DateSidebar'
import CategoryFilter from '@/components/news/CategoryFilter'
import NewsGrid from '@/components/news/NewsGrid'
import LoadingSkeleton from '@/components/news/LoadingSkeleton'
import ArticlePanel from '@/components/news/ArticlePanel'
import SearchSection from '@/components/search/SearchSection'

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
        </main>
      </div>

      {/* Article Side Panel */}
      <ArticlePanel article={openArticle} onClose={() => setOpenArticle(null)} />
    </div>
  )
}
