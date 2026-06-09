import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '보험 뉴스 대시보드',
  description: '보험 업계 최신 뉴스를 AI 요약으로 빠르게 파악하세요',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" data-theme="light">
      <body className="antialiased">{children}</body>
    </html>
  )
}
