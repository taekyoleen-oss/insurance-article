export default function SearchEmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center py-10 gap-2"
      style={{ color: 'var(--ins-text-muted)' }}
    >
      <p style={{ fontSize: '0.9375rem', fontWeight: 500 }}>검색 결과가 없습니다</p>
      <p style={{ fontSize: '0.8125rem', opacity: 0.7 }}>다른 키워드로 검색해 보세요</p>
    </div>
  )
}
