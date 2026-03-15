// GET /api/dates — 기사가 존재하는 모든 날짜+에디션 목록
import { NextResponse } from 'next/server'
import { getAllDatesWithEditions } from '@/lib/supabase/queries'

export const dynamic = 'force-dynamic'

export async function GET() {
  const dates = await getAllDatesWithEditions().catch(() => [])
  return NextResponse.json({ dates })
}
