import type { SearchResult } from '@/types'
import { Separator } from '@/components/ui/separator'
import SearchResultItem from './SearchResultItem'
import SearchEmptyState from './SearchEmptyState'

interface Props {
  results: SearchResult[]
}

export default function SearchResultList({ results }: Props) {
  if (results.length === 0) {
    return <SearchEmptyState />
  }

  return (
    <div>
      {results.map((result, i) => (
        <div key={i}>
          <SearchResultItem result={result} />
          {i < results.length - 1 && (
            <Separator style={{ background: 'var(--ins-border)' }} />
          )}
        </div>
      ))}
    </div>
  )
}
