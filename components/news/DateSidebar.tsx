'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Sun, Moon, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import type { Edition } from '@/types'
import type { DateWithEditions } from '@/lib/supabase/queries'

interface Props {
  dates: DateWithEditions[]
  selectedDate: string
  selectedEdition: Edition | null
  onSelect: (date: string, edition: Edition) => void
}

interface MonthGroup {
  monthKey: string    // '2026-03'
  monthLabel: string  // '2026년 3월'
  dates: DateWithEditions[]
}

// 'YYYY-MM-DD' → 'YYYY년 M월'
function toMonthLabel(date: string): string {
  const [y, m] = date.split('-')
  return `${y}년 ${parseInt(m, 10)}월`
}

// 'YYYY-MM-DD' → 'MM/DD (요일)'
function toDateLabel(date: string): string {
  const d = new Date(date + 'T00:00:00+09:00')
  const days = ['일', '월', '화', '수', '목', '금', '토']
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${mm}/${dd} (${days[d.getDay()]})`
}

function toEditionLabel(edition: Edition): string {
  return edition === '08:00' ? '오전 08:00' : '오후 14:00'
}

export default function DateSidebar({ dates, selectedDate, selectedEdition, onSelect }: Props) {
  // 열려 있는 사이드바 여부
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // 월별 그룹핑 (최신순)
  const monthGroups: MonthGroup[] = useMemo(() => {
    const map = new Map<string, DateWithEditions[]>()
    for (const d of dates) {
      const key = d.date.slice(0, 7) // 'YYYY-MM'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(d)
    }
    return Array.from(map.entries()).map(([key, ds]) => ({
      monthKey: key,
      monthLabel: toMonthLabel(ds[0].date),
      dates: ds,
    }))
  }, [dates])

  // 기본으로 가장 최근 달만 열어둠
  const [openMonths, setOpenMonths] = useState<Set<string>>(() => {
    const s = new Set<string>()
    if (monthGroups.length > 0) s.add(monthGroups[0].monthKey)
    return s
  })

  function toggleMonth(key: string) {
    setOpenMonths((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  // 접힌 사이드바
  if (!sidebarOpen) {
    return (
      <aside
        style={{
          width: '40px',
          flexShrink: 0,
          borderRight: '1px solid var(--ins-border)',
          background: 'var(--ins-surface)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: '12px',
        }}
      >
        <button
          onClick={() => setSidebarOpen(true)}
          title="사이드바 열기"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--ins-text-muted)',
            padding: '6px',
            borderRadius: '6px',
          }}
        >
          <PanelLeftOpen size={18} />
        </button>
      </aside>
    )
  }

  return (
    <aside
      style={{
        width: '200px',
        flexShrink: 0,
        borderRight: '1px solid var(--ins-border)',
        background: 'var(--ins-surface)',
        overflowY: 'auto',
        height: 'calc(100vh - 53px)',  // 헤더 높이 제외
        position: 'sticky',
        top: '53px',
        alignSelf: 'flex-start',
      }}
    >
      {/* 사이드바 헤더 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px 8px',
          borderBottom: '1px solid var(--ins-border)',
        }}
      >
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ins-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          에디션
        </span>
        <button
          onClick={() => setSidebarOpen(false)}
          title="사이드바 닫기"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--ins-text-muted)',
            padding: '2px',
            borderRadius: '4px',
          }}
        >
          <PanelLeftClose size={15} />
        </button>
      </div>

      {/* 월별 아코디언 */}
      {monthGroups.length === 0 ? (
        <p style={{ padding: '16px 12px', fontSize: '0.8rem', color: 'var(--ins-text-muted)' }}>
          에디션 없음
        </p>
      ) : (
        monthGroups.map((group) => {
          const isOpen = openMonths.has(group.monthKey)
          return (
            <div key={group.monthKey}>
              {/* 월 헤더 (토글) */}
              <button
                onClick={() => toggleMonth(group.monthKey)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--ins-text)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  textAlign: 'left',
                }}
              >
                <span>{group.monthLabel}</span>
                {isOpen
                  ? <ChevronDown size={13} style={{ color: 'var(--ins-text-muted)' }} />
                  : <ChevronRight size={13} style={{ color: 'var(--ins-text-muted)' }} />
                }
              </button>

              {/* 날짜 + 에디션 목록 */}
              {isOpen && (
                <div style={{ paddingBottom: '4px' }}>
                  {group.dates.map((d) => (
                    <div key={d.date}>
                      {/* 날짜 라벨 */}
                      <div
                        style={{
                          padding: '3px 12px 2px 20px',
                          fontSize: '0.75rem',
                          color: 'var(--ins-text-muted)',
                          fontWeight: 500,
                        }}
                      >
                        {toDateLabel(d.date)}
                      </div>
                      {/* 에디션 버튼들 */}
                      {d.editions.map((edition) => {
                        const isSelected = selectedDate === d.date && selectedEdition === edition
                        return (
                          <button
                            key={edition}
                            onClick={() => onSelect(d.date, edition)}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '7px',
                              padding: '5px 12px 5px 28px',
                              background: isSelected ? 'rgba(245,158,11,0.12)' : 'none',
                              border: 'none',
                              borderLeft: isSelected ? '2px solid #F59E0B' : '2px solid transparent',
                              cursor: 'pointer',
                              color: isSelected ? '#F59E0B' : 'var(--ins-text-muted)',
                              fontSize: '0.8rem',
                              textAlign: 'left',
                              fontWeight: isSelected ? 600 : 400,
                              transition: 'all 0.15s',
                            }}
                          >
                            {edition === '08:00'
                              ? <Sun size={12} />
                              : <Moon size={12} />
                            }
                            {toEditionLabel(edition)}
                          </button>
                        )
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })
      )}
    </aside>
  )
}
