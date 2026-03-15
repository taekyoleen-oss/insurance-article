'use client'

import { toKSTDateString } from '@/lib/utils/date-kst'

interface Props {
  selected: string
  onChange: (date: string) => void
}

function subtractDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00+09:00')
  d.setDate(d.getDate() - days)
  return toKSTDateString(d)
}

export default function DatePicker({ selected, onChange }: Props) {
  const today = toKSTDateString()
  const minDate = subtractDays(today, 30)

  return (
    <input
      type="date"
      value={selected}
      min={minDate}
      max={today}
      onChange={(e) => {
        if (e.target.value) onChange(e.target.value)
      }}
      style={{
        background: 'var(--ins-surface-alt)',
        border: '1px solid var(--ins-border)',
        borderRadius: '8px',
        color: 'var(--ins-text)',
        padding: '6px 12px',
        fontSize: '0.875rem',
        outline: 'none',
        cursor: 'pointer',
        colorScheme: 'dark',
      }}
    />
  )
}
