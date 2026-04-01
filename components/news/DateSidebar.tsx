'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Sun, Moon, PanelLeftClose, PanelLeftOpen, RefreshCw } from 'lucide-react'
import type { Edition } from '@/types'
import type { DateWithEditions } from '@/lib/supabase/queries'

interface Props {
  dates: DateWithEditions[]
  selectedDate: string
  selectedEdition: Edition | null
  onSelect: (date: string, edition: Edition) => void
}

interface PastMonthGroup {
  monthKey: string    // '2026-03'
  monthLabel: string  // 'Past 2026년 3월'
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

function getTodayKST(): string {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date()).replace(/\. /g, '-').replace('.', '')
}

function daysDiffFromToday(dateStr: string): number {
  const today = getTodayKST()
  const a = new Date(today + 'T00:00:00')
  const b = new Date(dateStr + 'T00:00:00')
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24))
}

const RECENT_THRESHOLD_DAYS = 7

type UpdateStatus = 'idle' | 'loading' | 'success' | 'error'

export default function DateSidebar({ dates, selectedDate, selectedEdition, onSelect }: Props) {
  // 사이드바 기본값: 닫힌 상태
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle')
  const [updateMessage, setUpdateMessage] = useState('')

  async function handleManualUpdate() {
    setUpdateStatus('loading')
    setUpdateMessage('')
    try {
      const res = await fetch('/api/manual-collect', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '업데이트 실패')
      setUpdateStatus('success')
      setUpdateMessage(data.message ?? `${data.inserted}건 업데이트됨`)
      // 2초 후 페이지 새로고침으로 신규 기사 반영
      setTimeout(() => window.location.reload(), 2000)
    } catch (e) {
      setUpdateStatus('error')
      setUpdateMessage(e instanceof Error ? e.message : '오류가 발생했습니다')
      setTimeout(() => setUpdateStatus('idle'), 3000)
    }
  }

  // 최근 7일 / 그 이전으로 분리
  const { recentDates, pastMonthGroups } = useMemo(() => {
    const recent: DateWithEditions[] = []
    const pastMap = new Map<string, DateWithEditions[]>()

    for (const d of dates) {
      if (daysDiffFromToday(d.date) <= RECENT_THRESHOLD_DAYS) {
        recent.push(d)
      } else {
        const key = d.date.slice(0, 7)
        if (!pastMap.has(key)) pastMap.set(key, [])
        pastMap.get(key)!.push(d)
      }
    }

    const pastGroups: PastMonthGroup[] = Array.from(pastMap.entries()).map(([key, ds]) => ({
      monthKey: key,
      monthLabel: `Past ${toMonthLabel(ds[0].date)}`,
      dates: ds,
    }))

    return { recentDates: recent, pastMonthGroups: pastGroups }
  }, [dates])

  // 최근 날짜별 열림 상태 — 가장 최근 날짜만 기본으로 열림
  const [openDates, setOpenDates] = useState<Set<string>>(() => {
    const s = new Set<string>()
    if (recentDates.length > 0) s.add(recentDates[0].date)
    return s
  })

  // 과거 월 그룹 — 기본값 모두 닫힘
  const [openPastMonths, setOpenPastMonths] = useState<Set<string>>(new Set())

  function toggleDate(date: string) {
    setOpenDates((prev) => {
      const next = new Set(prev)
      next.has(date) ? next.delete(date) : next.add(date)
      return next
    })
  }

  function togglePastMonth(key: string) {
    setOpenPastMonths((prev) => {
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
        height: 'calc(100vh - 53px)',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <button
            onClick={handleManualUpdate}
            disabled={updateStatus === 'loading'}
            title="수동 업데이트"
            style={{
              background: 'none',
              border: 'none',
              cursor: updateStatus === 'loading' ? 'not-allowed' : 'pointer',
              color: updateStatus === 'success' ? 'var(--ins-primary)' : updateStatus === 'error' ? '#ef4444' : 'var(--ins-text-muted)',
              padding: '2px',
              borderRadius: '4px',
              opacity: updateStatus === 'loading' ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <RefreshCw
              size={13}
              style={{
                animation: updateStatus === 'loading' ? 'spin 1s linear infinite' : 'none',
              }}
            />
          </button>
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
      </div>

      {/* 업데이트 상태 메시지 */}
      {updateStatus !== 'idle' && updateMessage && (
        <div
          style={{
            padding: '6px 12px',
            fontSize: '0.72rem',
            color: updateStatus === 'success' ? 'var(--ins-primary)' : updateStatus === 'error' ? '#ef4444' : 'var(--ins-text-muted)',
            borderBottom: '1px solid var(--ins-border)',
            lineHeight: 1.4,
          }}
        >
          {updateStatus === 'loading' ? '업데이트 중...' : updateMessage}
          {updateStatus === 'success' && ' 새로고침 중...'}
        </div>
      )}

      {dates.length === 0 ? (
        <p style={{ padding: '16px 12px', fontSize: '0.8rem', color: 'var(--ins-text-muted)' }}>
          에디션 없음
        </p>
      ) : (
        <>
          {/* ── 최근 7일 (날짜별 아코디언) ── */}
          {recentDates.map((d) => {
            const isDateOpen = openDates.has(d.date)
            return (
              <div key={d.date}>
                <button
                  onClick={() => toggleDate(d.date)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '7px 12px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--ins-text)',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    textAlign: 'left',
                  }}
                >
                  <span>{toDateLabel(d.date)}</span>
                  {isDateOpen
                    ? <ChevronDown size={13} style={{ color: 'var(--ins-text-muted)' }} />
                    : <ChevronRight size={13} style={{ color: 'var(--ins-text-muted)' }} />
                  }
                </button>

                {isDateOpen && (
                  <div style={{ paddingBottom: '4px' }}>
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
                            padding: '5px 12px 5px 24px',
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
                          {edition === '08:00' ? <Sun size={12} /> : <Moon size={12} />}
                          {toEditionLabel(edition)}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          {/* ── 과거 월 그룹 (기본 닫힘) ── */}
          {pastMonthGroups.map((group) => {
            const isOpen = openPastMonths.has(group.monthKey)
            return (
              <div key={group.monthKey}>
                <button
                  onClick={() => togglePastMonth(group.monthKey)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'none',
                    border: 'none',
                    borderTop: '1px solid var(--ins-border)',
                    cursor: 'pointer',
                    color: 'var(--ins-text-muted)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textAlign: 'left',
                    letterSpacing: '0.02em',
                  }}
                >
                  <span>{group.monthLabel}</span>
                  {isOpen
                    ? <ChevronDown size={12} style={{ color: 'var(--ins-text-muted)' }} />
                    : <ChevronRight size={12} style={{ color: 'var(--ins-text-muted)' }} />
                  }
                </button>

                {isOpen && (
                  <div style={{ paddingBottom: '4px' }}>
                    {group.dates.map((d) => (
                      <div key={d.date}>
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
                              {edition === '08:00' ? <Sun size={12} /> : <Moon size={12} />}
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
          })}
        </>
      )}
    </aside>
  )
}
