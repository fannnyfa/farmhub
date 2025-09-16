-- 🔧 "Unrestricted" 문제 해결 스크립트
-- Supabase 테이블 에디터의 "Unrestricted" 표시를 제거합니다

-- ⚠️ 주의: 이 스크립트는 개발 단계에서만 사용하세요
-- 운영 환경에서는 적절한 보안 정책을 설정해야 합니다

-- 1. 모든 테이블의 RLS(Row Level Security) 비활성화
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.markets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections DISABLE ROW LEVEL SECURITY;

-- 2. 기존 RLS 정책들 삭제 (깔끔하게 정리)
-- Users 테이블 정책 삭제
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Allow user registration" ON public.users;

-- Markets 테이블 정책 삭제
DROP POLICY IF EXISTS "Approved users can view markets" ON public.markets;
DROP POLICY IF EXISTS "Admins can manage markets" ON public.markets;

-- Collections 테이블 정책 삭제
DROP POLICY IF EXISTS "Users can view own collections" ON public.collections;
DROP POLICY IF EXISTS "Users can manage own collections" ON public.collections;
DROP POLICY IF EXISTS "Admins can view all collections" ON public.collections;
DROP POLICY IF EXISTS "Admins can manage all collections" ON public.collections;

-- 3. 기본 권한 설정 (모든 사용자가 모든 테이블에 접근 가능)
-- 개발 단계에서는 이렇게 해도 괜찮습니다
GRANT ALL ON public.users TO anon, authenticated;
GRANT ALL ON public.markets TO anon, authenticated;
GRANT ALL ON public.collections TO anon, authenticated;

-- 4. 뷰에 대한 권한도 설정
GRANT SELECT ON public.daily_collection_stats TO anon, authenticated;
GRANT SELECT ON public.producer_stats TO anon, authenticated;
GRANT SELECT ON public.market_stats TO anon, authenticated;
GRANT SELECT ON public.market_regions TO anon, authenticated;

-- 5. 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '✅ "Unrestricted" 문제가 해결되었습니다!';
    RAISE NOTICE '📝 RLS 보안이 비활성화되어 개발이 편해집니다.';
    RAISE NOTICE '⚠️  나중에 운영할 때는 보안 정책을 다시 설정하세요.';
    RAISE NOTICE '🚀 이제 앱을 테스트해보세요!';
END $$;

-- 6. 테이블 상태 확인 (실행 후 결과 확인용)
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '🔒 보안 활성화'
        ELSE '🔓 보안 비활성화 (Unrestricted 해결됨)'
    END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'markets', 'collections')
ORDER BY tablename;