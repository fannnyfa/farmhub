-- 🧹 데이터베이스 깔끔하게 다시 시작하기
-- 중복 데이터 제거 + Unrestricted 문제 해결 + 깨끗한 초기 데이터

-- ===================================================================
-- 1단계: 모든 데이터 안전하게 삭제 (외래키 순서 고려)
-- ===================================================================

DO $$
BEGIN
    RAISE NOTICE '🧹 데이터 정리를 시작합니다...';
END $$;

-- 외래키 때문에 순서 중요: collections → users → markets
DELETE FROM public.collections;
DELETE FROM public.users;  
DELETE FROM public.markets;

DO $$
BEGIN
    RAISE NOTICE '✅ 모든 기존 데이터가 삭제되었습니다.';
END $$;

-- ===================================================================
-- 2단계: RLS 보안 비활성화 (Unrestricted 문제 해결)
-- ===================================================================

-- 모든 테이블의 RLS 비활성화
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.markets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections DISABLE ROW LEVEL SECURITY;

-- 기존 RLS 정책들 삭제 (깔끔하게 정리)
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Allow user registration" ON public.users;
DROP POLICY IF EXISTS "Approved users can view markets" ON public.markets;
DROP POLICY IF EXISTS "Admins can manage markets" ON public.markets;
DROP POLICY IF EXISTS "Users can view own collections" ON public.collections;
DROP POLICY IF EXISTS "Users can manage own collections" ON public.collections;
DROP POLICY IF EXISTS "Admins can view all collections" ON public.collections;
DROP POLICY IF EXISTS "Admins can manage all collections" ON public.collections;

-- 모든 권한 부여 (개발 단계)
GRANT ALL ON public.users TO anon, authenticated;
GRANT ALL ON public.markets TO anon, authenticated;
GRANT ALL ON public.collections TO anon, authenticated;
GRANT SELECT ON public.daily_collection_stats TO anon, authenticated;
GRANT SELECT ON public.producer_stats TO anon, authenticated;
GRANT SELECT ON public.market_stats TO anon, authenticated;
GRANT SELECT ON public.market_regions TO anon, authenticated;

DO $$
BEGIN
    RAISE NOTICE '🔓 RLS 보안이 비활성화되었습니다. (Unrestricted 문제 해결)';
END $$;

-- ===================================================================
-- 3단계: 깨끗한 초기 데이터 입력
-- ===================================================================

DO $$
BEGIN
    RAISE NOTICE '📝 깨끗한 초기 데이터를 입력합니다...';
END $$;

-- 3-1. 기본 시장 정보 (8개)
INSERT INTO public.markets (name, location, is_active) VALUES
    ('가락시장', '서울특별시 송파구 양재대로 932', true),
    ('구리시장', '경기도 구리시 건원대로34번길 14', true),
    ('성남시장', '경기도 성남시 수정구 성남대로 1480', true),
    ('안성시장', '경기도 안성시 중앙로 327', true),
    ('수원시장', '경기도 수원시 팔달구 팔달로 255', true),
    ('평택시장', '경기도 평택시 중앙로 123', true),
    ('용인시장', '경기도 용인시 처인구 중부대로 1199', true),
    ('화성시장', '경기도 화성시 향남읍 행정중앙로 50', true);

-- 3-2. 테스트 사용자 계정 (3명) - 비밀번호: password
INSERT INTO public.users (email, name, password_hash, role, status) VALUES
    ('admin@farmhub.kr', '시스템 관리자', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'approved'),
    ('user@farmhub.kr', '일반 사용자', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 'approved'),
    ('test@farmhub.kr', '테스트 사용자', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 'pending');

-- 3-3. 샘플 수거 데이터 (5건)
WITH user_data AS (
    SELECT id as admin_id FROM public.users WHERE email = 'admin@farmhub.kr' LIMIT 1
)
INSERT INTO public.collections (user_id, producer_name, product_type, product_variety, box_weight, quantity, market, region, reception_date, status)
SELECT 
    admin_id,
    producer_name,
    product_type,
    product_variety,
    box_weight,
    quantity,
    market,
    region,
    reception_date,
    status
FROM user_data,
(VALUES 
    ('김사과농장', '사과', NULL, '10kg', 50, '가락시장', '경기도 안성', '2025-01-15', 'completed'),
    ('이과수농원', '사과', NULL, '10kg', 30, '구리시장', '경기도 여주', '2025-01-15', 'completed'),
    ('박감농장', '감', '단감', '10kg', 25, '성남시장', '경상북도 상주', '2025-01-16', 'pending'),
    ('최깻잎농원', '깻잎', '정품', '5kg', 100, '안성시장', '충청남도 천안', '2025-01-16', 'pending'),
    ('장사과마을', '사과', NULL, '10kg', 45, '수원시장', '경기도 평택', '2025-01-17', 'pending')
) AS sample_data(producer_name, product_type, product_variety, box_weight, quantity, market, region, reception_date, status);

-- ===================================================================
-- 4단계: 완료 확인 및 결과 출력
-- ===================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 데이터베이스 깔끔한 재시작 완료!';
    RAISE NOTICE '✅ 중복 데이터 완전 제거됨';
    RAISE NOTICE '🔓 Unrestricted 문제 해결됨';
    RAISE NOTICE '📊 깨끗한 초기 데이터 입력 완료';
    RAISE NOTICE '';
    RAISE NOTICE '📋 입력된 데이터:';
    RAISE NOTICE '  - 시장: 8개';
    RAISE NOTICE '  - 사용자: 3명 (admin@farmhub.kr, user@farmhub.kr, test@farmhub.kr)';
    RAISE NOTICE '  - 수거기록: 5건';
    RAISE NOTICE '';
    RAISE NOTICE '🔑 로그인 정보: 비밀번호 모두 "password"';
    RAISE NOTICE '🚀 이제 앱을 테스트해보세요!';
END $$;

-- 5. 최종 데이터 개수 확인
SELECT 
    '📊 최종 데이터 현황' as info,
    (SELECT COUNT(*) FROM public.users) as users_count,
    (SELECT COUNT(*) FROM public.markets) as markets_count,
    (SELECT COUNT(*) FROM public.collections) as collections_count;

-- 6. 테이블 보안 상태 확인
SELECT 
    '🔓 테이블 보안 상태' as info,
    tablename,
    CASE 
        WHEN rowsecurity THEN '🔒 보안 활성화'
        ELSE '🔓 보안 비활성화 (개발모드)'
    END as security_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'markets', 'collections')
ORDER BY tablename;