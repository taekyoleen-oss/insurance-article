import { Skeleton } from '@/components/ui/skeleton'

export default function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-6 py-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          style={{
            background: 'var(--ins-surface)',
            border: '1px solid var(--ins-border)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div className="flex items-center gap-2">
            <Skeleton
              style={{ background: 'var(--ins-surface-alt)', width: '64px', height: '20px', borderRadius: '9999px' }}
            />
            <Skeleton
              style={{ background: 'var(--ins-surface-alt)', width: '48px', height: '16px', borderRadius: '4px' }}
            />
          </div>
          <Skeleton
            style={{ background: 'var(--ins-surface-alt)', width: '100%', height: '20px', borderRadius: '4px' }}
          />
          <Skeleton
            style={{ background: 'var(--ins-surface-alt)', width: '80%', height: '20px', borderRadius: '4px' }}
          />
          <Skeleton
            style={{ background: 'var(--ins-surface-alt)', width: '100%', height: '14px', borderRadius: '4px' }}
          />
          <Skeleton
            style={{ background: 'var(--ins-surface-alt)', width: '60%', height: '14px', borderRadius: '4px' }}
          />
        </div>
      ))}
    </div>
  )
}
