// KST 날짜 변환 유틸
// Intl.DateTimeFormat 사용 (설계서 확정)

const KST_FORMAT = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

// Date → 'YYYY-MM-DD' (KST)
export function toKSTDateString(date: Date = new Date()): string {
  const parts = KST_FORMAT.formatToParts(date)
  const y = parts.find((p) => p.type === 'year')!.value
  const m = parts.find((p) => p.type === 'month')!.value
  const d = parts.find((p) => p.type === 'day')!.value
  return `${y}-${m}-${d}`
}

// edition 쿼리 파라미터 → Edition 값으로 매핑
// ?edition=0800 → '08:00'
// ?edition=1400 → '14:00'
export function parseEditionParam(param: string | null): '08:00' | '14:00' | null {
  if (param === '0800') return '08:00'
  if (param === '1400') return '14:00'
  return null
}

// KST 기준 요일 반환 (0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토)
export function getKSTDayOfWeek(date: Date = new Date()): number {
  const kst = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
  return kst.getDay()
}

// KST 기준 오늘이 주말인지 확인
export function isKSTWeekend(date: Date = new Date()): boolean {
  const day = getKSTDayOfWeek(date)
  return day === 0 || day === 6 // 일요일(0) 또는 토요일(6)
}

// KST 기준 오늘이 월요일인지 확인
export function isKSTMonday(date: Date = new Date()): boolean {
  return getKSTDayOfWeek(date) === 1
}

export function formatPublishedAt(isoString: string | null): string {
  if (!isoString) return ''
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoString))
}
