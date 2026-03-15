'use client'

import type { NewsArticleWithSimilar } from '@/types'
import NewsCard from './NewsCard'
import EmptyState from './EmptyState'

interface Props {
  articles: NewsArticleWithSimilar[]
  onCardClick: (a: NewsArticleWithSimilar) => void
}

export default function NewsGrid({ articles, onCardClick }: Props) {
  if (articles.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-6 py-4">
      {articles.map((article, i) => (
        <div
          key={article.id}
          style={{
            animationName: 'fadeIn',
            animationDuration: '0.4s',
            animationTimingFunction: 'ease-out',
            animationFillMode: 'both',
            animationDelay: `${i * 0.05}s`,
          }}
        >
          <NewsCard article={article} onClick={() => onCardClick(article)} />
        </div>
      ))}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
