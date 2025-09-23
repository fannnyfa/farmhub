-- 깻잎 바라 무게 제약조건 최종 수정
-- 문제: 중복된 5kg 제약으로 인한 깻잎 바라 등록 실패
-- 해결: 중복 제거 및 올바른 제약조건 설정

-- 1. 기존 제약조건 완전 제거
ALTER TABLE public.collections DROP CONSTRAINT IF EXISTS collections_box_weight_check;

-- 2. 올바른 제약조건 추가 (중복 제거)
ALTER TABLE public.collections 
    ADD CONSTRAINT collections_box_weight_check 
    CHECK (
        box_weight IN (
            -- 사과/감/깻잎 공통 무게
            '5kg', '10kg',
            -- 깻잎 바라 전용 무게
            '3kg', '3.5kg', '4kg', '4.5kg'
        )
        OR box_weight IS NULL
    );

-- 3. 컬럼 설명 업데이트
COMMENT ON COLUMN public.collections.box_weight IS '박스 중량: 사과/감(5kg,10kg), 깻잎 바라(3kg,3.5kg,4kg,4.5kg,5kg 모든 무게 지원)';

-- 4. 테스트 데이터 삽입으로 검증
-- INSERT INTO public.collections (user_id, producer_name, product_type, product_variety, box_weight, quantity, market, region, reception_date, status)
-- VALUES 
--     (1, '테스트농장', '깻잎', '바라', '3kg', 10, '테스트공판장', '테스트지역', NOW(), 'pending'),
--     (1, '테스트농장', '깻잎', '바라', '3.5kg', 10, '테스트공판장', '테스트지역', NOW(), 'pending'),
--     (1, '테스트농장', '깻잎', '바라', '4kg', 10, '테스트공판장', '테스트지역', NOW(), 'pending'),
--     (1, '테스트농장', '깻잎', '바라', '4.5kg', 10, '테스트공판장', '테스트지역', NOW(), 'pending'),
--     (1, '테스트농장', '깻잎', '바라', '5kg', 10, '테스트공판장', '테스트지역', NOW(), 'pending');