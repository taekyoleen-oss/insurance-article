interface Props {
  count: number
}

export default function SimilarCountBadge({ count }: Props) {
  if (count <= 0) return null

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 500,
        background: 'rgba(245,158,11,0.15)',
        color: '#F59E0B',
        border: '1px solid rgba(245,158,11,0.3)',
      }}
    >
      관련 {count}건
    </span>
  )
}
