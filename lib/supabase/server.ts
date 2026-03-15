import { createClient } from '@supabase/supabase-js'

// 서버 전용 (API Route, Server Component)
// service_role key 사용 — 절대 클라이언트에 노출 금지
export const createServerClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
