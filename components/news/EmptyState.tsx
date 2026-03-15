import { Newspaper } from 'lucide-react'

export default function EmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center py-24 gap-4"
      style={{ color: 'var(--ins-text-muted)' }}
    >
      <Newspaper size={48} style={{ opacity: 0.3 }} />
      <p style={{ fontSize: '1rem', fontWeight: 500 }}>해당 에디션 기사가 없습니다</p>
      <p style={{ fontSize: '0.875rem', opacity: 0.6 }}>다른 날짜나 에디션을 선택해 보세요</p>
    </div>
  )
}
