-- 초기 데이터 입력

-- 1. 기본 시장 정보 삽입
INSERT INTO public.markets (name, location, is_active) VALUES
    ('가락시장', '서울특별시 송파구 양재대로 932', true),
    ('구리시장', '경기도 구리시 건원대로34번길 14', true),
    ('성남시장', '경기도 성남시 수정구 성남대로 1480', true),
    ('안성시장', '경기도 안성시 중앙로 327', true),
    ('수원시장', '경기도 수원시 팔달구 팔달로 255', true),
    ('평택시장', '경기도 평택시 중앙로 123', true),
    ('용인시장', '경기도 용인시 처인구 중부대로 1199', true),
    ('화성시장', '경기도 화성시 향남읍 행정중앙로 50', true),
    ('엄궁놈협공판장', '부산광역시 엄궁동', true)
ON CONFLICT (name) DO NOTHING;

-- 2. 테스트 사용자 계정 생성
-- 주의: 실제 운영 환경에서는 더 안전한 비밀번호 해시를 사용해야 합니다
-- 이 예제에서는 'password'를 bcrypt로 해시한 값을 사용합니다
-- $2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi (password)

INSERT INTO public.users (email, name, password_hash, role, status) VALUES
    ('admin@farmhub.kr', '시스템 관리자', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'approved'),
    ('user@farmhub.kr', '일반 사용자', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 'approved'),
    ('test@farmhub.kr', '테스트 사용자', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 'pending')
ON CONFLICT (email) DO NOTHING;

-- 3. 샘플 수거 데이터 삽입 (테스트용)
-- 먼저 사용자 ID를 가져오기 위한 변수 설정
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
    ('장사과마을', '사과', NULL, '10kg', 45, '수원시장', '경기도 평택', '2025-01-17', 'pending'),
    ('엄궁깻잎농장', '깻잎', '정품', '2kg', 50, '엄궁놈협공판장', '엄궁동', '2025-01-17', 'pending')
) AS sample_data(producer_name, product_type, product_variety, box_weight, quantity, market, region, reception_date, status);

-- 데이터 입력 완료 메시지
-- PostgreSQL에서는 PRINT 대신 RAISE NOTICE 사용
DO $$
BEGIN
    RAISE NOTICE '초기 데이터 입력이 완료되었습니다.';
    RAISE NOTICE '- 기본 시장: 8개';
    RAISE NOTICE '- 테스트 사용자: 3명 (admin@farmhub.kr, user@farmhub.kr, test@farmhub.kr)';
    RAISE NOTICE '- 샘플 수거 기록: 5건';
    RAISE NOTICE '기본 로그인 비밀번호: password';
END $$;