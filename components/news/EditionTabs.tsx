'use client'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Edition } from '@/types'

interface Props {
  editions: Edition[]
  selected: Edition | null
  onChange: (e: Edition) => void
}

const EDITION_LABELS: Record<Edition, string> = {
  '08:00': '오전 08:00',
  '14:00': '오후 14:00',
}

const ALL_EDITIONS: Edition[] = ['08:00', '14:00']

export default function EditionTabs({ editions, selected, onChange }: Props) {
  return (
    <Tabs value={selected ?? ''} onValueChange={(v) => onChange(v as Edition)}>
      <TabsList
        style={{
          background: 'var(--ins-surface-alt)',
          border: '1px solid var(--ins-border)',
          borderRadius: '9999px',
          padding: '4px',
        }}
      >
        {ALL_EDITIONS.map((edition) => {
          const available = editions.includes(edition)
          const isActive = selected === edition
          return (
            <TabsTrigger
              key={edition}
              value={edition}
              disabled={!available}
              style={{
                borderRadius: '9999px',
                padding: '6px 20px',
                fontSize: '0.875rem',
                fontWeight: 500,
                background: isActive ? 'var(--ins-primary)' : 'transparent',
                color: isActive
                  ? 'var(--ins-primary-fg)'
                  : available
                  ? 'var(--ins-text)'
                  : 'var(--ins-text-muted)',
                opacity: available ? 1 : 0.4,
                cursor: available ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
                border: 'none',
              }}
            >
              {EDITION_LABELS[edition]}
            </TabsTrigger>
          )
        })}
      </TabsList>
    </Tabs>
  )
}
