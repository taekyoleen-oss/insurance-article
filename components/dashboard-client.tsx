'use client'

import { useState } from 'react'
import type { NewsArticleWithSimilar, Edition, Category } from '@/types'
import { Newspaper } from 'lucide-react'
import DatePicker from '@/components/news/DatePicker'
import EditionTabs from '@/components/news/EditionTabs'
import CategoryFilter from '@/components/news/CategoryFilter'
import NewsGrid from '@/components/news/NewsGrid'
import LoadingSkeleton from '@/components/news/LoadingSkeleton'
import ArticlePanel from '@/components/news/ArticlePanel'
import SearchSection from '@/components/search/SearchSection'

interface Props {
  initialArticles: NewsArticleWithSimilar[]
  initialDate: string
  initialEdition: Edition | null
  availableEditions: Edition[]
}

export default function DashboardClient({
  initialArticles,
  initialDate,
  initialEdition,
  availableEditions: initialAvailableEditions,
}: Props) {
  const [articles, setArticles] = useState<NewsArticleWithSimilar[]>(initialArticles)
  const [selectedDate, setSelectedDate] = useState<string>(initialDate)
  const [selectedEdition, setSelectedEdition] = useState<Edition | null>(initialEdition)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [availableEditions, setAvailableEditions] = useState<Edition[]>(initialAvailableEditions)
  const [loading, setLoading] = useState(false)
  const [openArticle, setOpenArticle] = useState<NewsArticleWithSimilar | null>(null)

  const filteredArticles = articles.filter(
    (a) => !selectedCategory || a.category === selectedCategory,
  )

  async function fetchArticles(date: string, edition: Edition) {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/news?date=${encodeURIComponent(date)}&edition=${encodeURIComponent(edition)}`,
      )
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      setArticles(json.articles ?? [])
    } catch {
      setArticles([])
    } finally {
      setLoading(false)
    }
  }

  async function handleDateChange(date: string) {
    setSelectedDate(date)
    setSelectedCategory(null)

    // Fetch available editions for this date
    try {
      const res = await fetch(`/api/news?date=${encodeURIComponent(date)}&edition=08:00`)
      const res2 = await fetch(`/api/news?date=${encodeURIComponent(date)}&edition=14:00`)

      const newEditions: Edition[] = []
      if (res.ok) {
        const j = await res.json()
        if ((j.articles ?? []).length > 0) newEditions.push('08:00')
      }
      if (res2.ok) {
        const j2 = await res2.json()
        if ((j2.articles ?? []).length > 0) newEditions.push('14:00')
      }

      setAvailableEditions(newEditions)

      const newDefaultEdition: Edition | null = newEditions.includes('14:00')
        ? '14:00'
        : newEditions.includes('08:00')
        ? '08:00'
        : null

      setSelectedEdition(newDefaultEdition)

      if (newDefaultEdition) {
        const res = await fetch(
          `/api/news?date=${encodeURIComponent(date)}&edition=${encodeURIComponent(newDefaultEdition)}`,
        )
        if (res.ok) {
          const json = await res.json()
          setArticles(json.articles ?? [])
        } else {
          setArticles([])
        }
      } else {
        setArticles([])
      }
    } catch {
      setArticles([])
    } finally {
      setLoading(false)
    }
  }

  async function handleEditionChange(edition: Edition) {
    setSelectedEdition(edition)
    setSelectedCategory(null)
    await fetchArticles(selectedDate, edition)
  }

  return (
    <div style={{ background: 'var(--ins-bg)', minHeight: '100vh', color: 'var(--ins-text)' }}>
      {/* Header */}
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
            maxWidth: '1400px',
            margin: '0 auto',
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div className="flex items-center gap-3">
            <Newspaper size={22} style={{ color: 'var(--ins-primary)' }} />
            <h1
              style={{
                fontSize: '1.125rem',
                fontWeight: 700,
                color: 'var(--ins-text)',
                letterSpacing: '-0.01em',
              }}
            >
              보험 뉴스 대시보드
            </h1>
          </div>
          <DatePicker
            selected={selectedDate}
            onChange={(date) => {
              setLoading(true)
              handleDateChange(date)
            }}
          />
        </div>
      </header>

      {/* Main */}
      <main style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Edition Tabs */}
        <div style={{ padding: '16px 24px 0' }}>
          <EditionTabs
            editions={availableEditions}
            selected={selectedEdition}
            onChange={handleEditionChange}
          />
        </div>

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

      {/* Article Side Panel */}
      <ArticlePanel article={openArticle} onClose={() => setOpenArticle(null)} />
    </div>
  )
}
