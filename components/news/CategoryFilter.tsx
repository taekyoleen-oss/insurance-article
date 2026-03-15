'use client'

import type { Category } from '@/types'
import type { NewsArticleWithSimilar } from '@/types'

interface Props {
  selected: Category | null
  onChange: (c: Category | null) => void
  articles: NewsArticleWithSimilar[]
}

const CATEGORIES: Category[] = ['업계동향', '상품', '언더라이팅', '클레임', '정책', '기타']

export default function CategoryFilter({ selected, onChange, articles }: Props) {
  const countFor = (cat: Category | null) => {
    if (cat === null) return articles.length
    return articles.filter((a) => a.category === cat).length
  }

  return (
    <div className="flex flex-wrap gap-2 px-6 py-3">
      <button
        onClick={() => onChange(null)}
        style={{
          padding: '5px 14px',
          borderRadius: '9999px',
          fontSize: '0.8125rem',
          fontWeight: 500,
          border: '1px solid',
          borderColor: selected === null ? '#F59E0B' : 'var(--ins-border)',
          background: selected === null ? 'rgba(245,158,11,0.15)' : 'transparent',
          color: selected === null ? '#F59E0B' : 'var(--ins-text-muted)',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        전체 ({countFor(null)})
      </button>
      {CATEGORIES.map((cat) => {
        const count = countFor(cat)
        const isSelected = selected === cat
        return (
          <button
            key={cat}
            onClick={() => onChange(cat)}
            style={{
              padding: '5px 14px',
              borderRadius: '9999px',
              fontSize: '0.8125rem',
              fontWeight: 500,
              border: '1px solid',
              borderColor: isSelected ? '#F59E0B' : 'var(--ins-border)',
              background: isSelected ? 'rgba(245,158,11,0.15)' : 'transparent',
              color: isSelected ? '#F59E0B' : 'var(--ins-text-muted)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {cat} ({count})
          </button>
        )
      })}
    </div>
  )
}
