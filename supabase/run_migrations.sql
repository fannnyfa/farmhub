-- 모든 마이그레이션을 순차적으로 실행하는 종합 스크립트
-- Supabase SQL Editor에서 이 파일을 복사하여 실행하세요

-- 1단계: Users 테이블 생성
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    remember_token VARCHAR(100) NULL,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 업데이트 시간 자동 갱신을 위한 함수 및 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON public.users
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);

-- 2단계: Markets 테이블 생성
CREATE TABLE IF NOT EXISTS public.markets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(500) NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_markets_name ON public.markets(name);
CREATE INDEX IF NOT EXISTS idx_markets_is_active ON public.markets(is_active);

-- 3단계: Collections 테이블 생성
CREATE TABLE IF NOT EXISTS public.collections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    producer_name VARCHAR(255) NOT NULL,
    product_type VARCHAR(50) DEFAULT '사과' CHECK (product_type IN ('사과', '감', '깻잎')),
    product_variety VARCHAR(50) NULL,
    box_weight VARCHAR(10) DEFAULT '10kg',
    quantity INTEGER NULL CHECK (quantity >= 0),
    market VARCHAR(255) NULL,
    region VARCHAR(255) NULL,
    reception_date DATE NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 업데이트 시간 자동 갱신 트리거 적용
CREATE TRIGGER update_collections_updated_at 
    BEFORE UPDATE ON public.collections
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON public.collections(user_id);
CREATE INDEX IF NOT EXISTS idx_collections_producer_name ON public.collections(producer_name);
CREATE INDEX IF NOT EXISTS idx_collections_product_type ON public.collections(product_type);
CREATE INDEX IF NOT EXISTS idx_collections_market ON public.collections(market);
CREATE INDEX IF NOT EXISTS idx_collections_status ON public.collections(status);
CREATE INDEX IF NOT EXISTS idx_collections_reception_date ON public.collections(reception_date);
CREATE INDEX IF NOT EXISTS idx_collections_created_at ON public.collections(created_at);

-- 복합 인덱스 (자주 사용되는 필터 조합)
CREATE INDEX IF NOT EXISTS idx_collections_status_date ON public.collections(status, reception_date);
CREATE INDEX IF NOT EXISTS idx_collections_user_status ON public.collections(user_id, status);

-- 4단계: 분석용 뷰 생성
-- 일별 수거 통계 뷰
CREATE OR REPLACE VIEW public.daily_collection_stats AS
SELECT 
    reception_date,
    product_type,
    box_weight,
    COUNT(*) as total_collections,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
    COALESCE(SUM(quantity), 0) as total_quantity
FROM public.collections 
WHERE reception_date IS NOT NULL
GROUP BY reception_date, product_type, box_weight
ORDER BY reception_date DESC, product_type;

-- 생산자별 통계 뷰
CREATE OR REPLACE VIEW public.producer_stats AS
SELECT 
    producer_name,
    product_type,
    COUNT(*) as collection_count,
    COALESCE(SUM(quantity), 0) as total_quantity,
    MAX(reception_date) as last_collection_date
FROM public.collections
GROUP BY producer_name, product_type
ORDER BY collection_count DESC, total_quantity DESC;

-- 시장별 통계 뷰  
CREATE OR REPLACE VIEW public.market_stats AS
SELECT 
    market,
    region,
    product_type,
    COUNT(*) as collection_count,
    COALESCE(SUM(quantity), 0) as total_quantity,
    MAX(reception_date) as last_collection_date
FROM public.collections
WHERE market IS NOT NULL
GROUP BY market, region, product_type
ORDER BY collection_count DESC, total_quantity DESC;

-- 시장-지역 매핑 뷰
CREATE OR REPLACE VIEW public.market_regions AS
SELECT DISTINCT
    m.id,
    m.name as market_name,
    c.region
FROM public.markets m
LEFT JOIN public.collections c ON m.name = c.market
WHERE c.region IS NOT NULL
ORDER BY m.name, c.region;

-- 5단계: 초기 데이터 입력
-- 기본 시장 정보
INSERT INTO public.markets (name, location, is_active) VALUES
    ('가락시장', '서울특별시 송파구 양재대로 932', true),
    ('구리시장', '경기도 구리시 건원대로34번길 14', true),
    ('성남시장', '경기도 성남시 수정구 성남대로 1480', true),
    ('안성시장', '경기도 안성시 중앙로 327', true),
    ('수원시장', '경기도 수원시 팔달구 팔달로 255', true),
    ('평택시장', '경기도 평택시 중앙로 123', true),
    ('용인시장', '경기도 용인시 처인구 중부대로 1199', true),
    ('화성시장', '경기도 화성시 향남읍 행정중앙로 50', true)
ON CONFLICT (name) DO NOTHING;

-- 테스트 사용자 계정 생성 (비밀번호: password)
INSERT INTO public.users (email, name, password_hash, role, status) VALUES
    ('admin@farmhub.kr', '시스템 관리자', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'approved'),
    ('user@farmhub.kr', '일반 사용자', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 'approved'),
    ('test@farmhub.kr', '테스트 사용자', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 'pending')
ON CONFLICT (email) DO NOTHING;

-- 샘플 수거 데이터
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

-- 완료 메시지
SELECT '데이터베이스 스키마 생성이 완료되었습니다!' as message;
SELECT '기본 로그인 정보: admin@farmhub.kr / user@farmhub.kr (비밀번호: password)' as login_info;