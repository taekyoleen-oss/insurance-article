import he from 'he'

// HTML 태그 제거 + 엔티티 디코딩
export function sanitize(raw: string): string {
  return he.decode(raw.replace(/<[^>]+>/g, '').trim())
}

// snippet을 최대 N자로 자르기 (단어 중간 자르기 방지)
export function truncateSnippet(text: string, maxLength = 100): string {
  const cleaned = sanitize(text)
  if (cleaned.length <= maxLength) return cleaned
  return cleaned.slice(0, maxLength).trimEnd() + '…'
}
