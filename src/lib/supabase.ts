import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // 환경 변수가 없는 경우 null 반환 (빌드 오류 방지)
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase 환경 변수가 설정되지 않았습니다. 일부 기능이 제한될 수 있습니다.')
    return null
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}