-- box_weight 제약조건 수정 - 깻잎 바라의 소수점 무게 허용
-- 목표: 3kg, 3.5kg, 4kg, 4.5kg, 5kg 값이 그대로 저장되도록 수정

-- 기존 제약조건 제거 (존재하는 경우)
DO $$ 
BEGIN
    -- collections_box_weight_check 제약조건이 존재하면 제거
    IF EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'collections_box_weight_check'
    ) THEN
        ALTER TABLE public.collections DROP CONSTRAINT collections_box_weight_check;
        RAISE NOTICE 'Existing box_weight constraint removed successfully';
    END IF;
END $$;

-- box_weight 컬럼 타입 확장 - 소수점 무게 저장을 위해 더 긴 문자열 허용
ALTER TABLE public.collections 
    ALTER COLUMN box_weight TYPE VARCHAR(20);

-- 새로운 제약조건 추가 - 모든 깻잎 바라 무게 옵션 허용
ALTER TABLE public.collections 
    ADD CONSTRAINT collections_box_weight_check 
    CHECK (
        box_weight IN (
            -- 사과/감/깻잎 공통 무게
            '5kg', '10kg',
            -- 깻잎 바라 전용 무게 (소수점 포함)
            '3kg', '3.5kg', '4kg', '4.5kg'
        )
        OR box_weight IS NULL
    );

-- 업데이트된 컬럼 설명
COMMENT ON COLUMN public.collections.box_weight IS '박스 중량: 사과/감(5kg,10kg), 깻잎 바라(3kg,3.5kg,4kg,4.5kg,5kg)';