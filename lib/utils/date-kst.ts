// KST 날짜 변환 유틸
// Intl.DateTimeFormat 사용 (설계서 확정)

// 수집 시간 윈도우 — 에디션별 기사 발행 기간 범위
export interface CollectionWindow {
  start: Date    // 이 시각 이후 발행된 기사만 수집
  end: Date      // 이 시각 이전 발행된 기사만 수집
  label: string  // 로그용 설명
}

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

// 'YYYY-MM-DD' + KST 시각 → UTC Date
// "+09:00" 오프셋을 ISO 문자열에 포함시켜 정확한 UTC 변환
function kstDateHourToUTC(kstDate: string, hour: number): Date {
  const hh = String(hour).padStart(2, '0')
  return new Date(`${kstDate}T${hh}:00:00+09:00`)
}

// 오늘 KST 기준 N일 전 날짜 문자열 반환
function kstDateNDaysAgo(n: number): string {
  return toKSTDateString(new Date(Date.now() - n * 24 * 60 * 60 * 1000))
}

// 에디션별 기사 수집 시간 윈도우
// - 08:00 에디션 (평일): 어제 14:00 KST ~ 오늘 08:00 KST
// - 08:00 에디션 (월요일): 지난 금요일 14:00 KST ~ 오늘(월) 08:00 KST
// - 14:00 에디션: 오늘 08:00 KST ~ 오늘 14:00 KST
export function getCollectionWindow(
  edition: '08:00' | '14:00',
  isMonday: boolean,
): CollectionWindow {
  const today = toKSTDateString()

  if (edition === '14:00') {
    return {
      start: kstDateHourToUTC(today, 8),
      end: kstDateHourToUTC(today, 14),
      label: `${today} 08:00 ~ 14:00 KST`,
    }
  }

  // 08:00 에디션
  if (isMonday) {
    // 월요일: 금요일(3일 전) 14:00 ~ 오늘 08:00
    const friday = kstDateNDaysAgo(3)
    return {
      start: kstDateHourToUTC(friday, 14),
      end: kstDateHourToUTC(today, 8),
      label: `${friday} 14:00 ~ ${today} 08:00 KST (주말 포함)`,
    }
  }

  // 일반 평일 08:00: 어제 14:00 ~ 오늘 08:00
  const yesterday = kstDateNDaysAgo(1)
  return {
    start: kstDateHourToUTC(yesterday, 14),
    end: kstDateHourToUTC(today, 8),
    label: `${yesterday} 14:00 ~ ${today} 08:00 KST`,
  }
}

// 테스트 모드: 최근 48시간 윈도우 (주말 무관, 항상 기사 확보)
export function getTestCollectionWindow(): CollectionWindow {
  const end = new Date()
  const start = new Date(end.getTime() - 48 * 60 * 60 * 1000)
  return {
    start,
    end,
    label: `최근 48시간 (테스트)`,
  }
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
