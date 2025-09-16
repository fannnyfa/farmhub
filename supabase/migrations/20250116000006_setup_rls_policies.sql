-- RLS (Row Level Security) 정책 설정

-- 1. 먼저 각 테이블에 RLS 활성화
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

-- 2. Users 테이블 RLS 정책
-- 관리자는 모든 사용자 정보 조회/수정 가능
CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'admin' 
            AND status = 'approved'
        )
    );

CREATE POLICY "Admins can update all users" ON public.users
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'admin' 
            AND status = 'approved'
        )
    );

-- 일반 사용자는 자신의 정보만 조회 가능
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT 
    USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE
    USING (id = auth.uid());

-- 새 사용자 등록 허용 (회원가입)
CREATE POLICY "Allow user registration" ON public.users
    FOR INSERT
    WITH CHECK (true);

-- 3. Markets 테이블 RLS 정책
-- 모든 승인된 사용자는 시장 정보 조회 가능
CREATE POLICY "Approved users can view markets" ON public.markets
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND status = 'approved'
        )
    );

-- 관리자만 시장 정보 수정 가능
CREATE POLICY "Admins can manage markets" ON public.markets
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'admin' 
            AND status = 'approved'
        )
    );

-- 4. Collections 테이블 RLS 정책
-- 사용자는 자신이 생성한 수거 기록만 조회/수정 가능
CREATE POLICY "Users can view own collections" ON public.collections
    FOR SELECT 
    USING (
        user_id = auth.uid() 
        AND EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND status = 'approved'
        )
    );

CREATE POLICY "Users can manage own collections" ON public.collections
    FOR ALL
    USING (
        user_id = auth.uid() 
        AND EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND status = 'approved'
        )
    )
    WITH CHECK (
        user_id = auth.uid() 
        AND EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND status = 'approved'
        )
    );

-- 관리자는 모든 수거 기록 조회/관리 가능
CREATE POLICY "Admins can view all collections" ON public.collections
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'admin' 
            AND status = 'approved'
        )
    );

CREATE POLICY "Admins can manage all collections" ON public.collections
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'admin' 
            AND status = 'approved'
        )
    );

-- 5. 분석용 뷰에 대한 권한 설정
-- 승인된 모든 사용자는 분석 데이터 조회 가능 (개인정보 제외)
GRANT SELECT ON public.daily_collection_stats TO authenticated;
GRANT SELECT ON public.producer_stats TO authenticated;
GRANT SELECT ON public.market_stats TO authenticated;
GRANT SELECT ON public.market_regions TO authenticated;

-- 6. 함수 보안 설정 (현재 사용자 정보를 가져오는 함수)
CREATE OR REPLACE FUNCTION public.get_current_user()
RETURNS TABLE(id UUID, email TEXT, name TEXT, role TEXT, status TEXT)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $$
    SELECT u.id, u.email, u.name, u.role, u.status
    FROM public.users u
    WHERE u.id = auth.uid();
$$;

-- 7. 관리자 권한 확인 함수
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role = 'admin' 
        AND status = 'approved'
    );
$$;

-- 8. 승인된 사용자 확인 함수
CREATE OR REPLACE FUNCTION public.is_approved_user()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND status = 'approved'
    );
$$;

-- RLS 정책 설정 완료 메시지
DO $$
BEGIN
    RAISE NOTICE 'RLS 정책 설정이 완료되었습니다.';
    RAISE NOTICE '- 사용자별 데이터 접근 제어 활성화';
    RAISE NOTICE '- 역할 기반 권한 관리 (admin/user)';
    RAISE NOTICE '- 보안 함수 생성 완료';
END $$;