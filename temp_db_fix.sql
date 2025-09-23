-- 깻잎 바라 소수점 무게 허용을 위한 데이터베이스 수정
-- 브라우저 개발자 도구에서 실행할 SQL

-- 1단계: 기존 제약조건 제거
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'collections_box_weight_check'
    ) THEN
        ALTER TABLE public.collections DROP CONSTRAINT collections_box_weight_check;
        RAISE NOTICE 'box_weight 제약조건 제거 완료';
    END IF;
END $$;

-- 2단계: 컬럼 타입 확장
ALTER TABLE public.collections ALTER COLUMN box_weight TYPE VARCHAR(20);

-- 3단계: 새로운 제약조건 추가 (소수점 무게 포함)
ALTER TABLE public.collections 
ADD CONSTRAINT collections_box_weight_check 
CHECK (
    box_weight IN ('5kg', '10kg', '3kg', '3.5kg', '4kg', '4.5kg')
    OR box_weight IS NULL
);

-- 4단계: 컬럼 설명 업데이트
COMMENT ON COLUMN public.collections.box_weight IS '박스 중량: 사과/감(5kg,10kg), 깻잎 바라(3kg,3.5kg,4kg,4.5kg,5kg)';

-- 완료 메시지
SELECT 'box_weight 제약조건 수정 완료! 이제 3kg, 3.5kg, 4kg, 4.5kg 등록 가능' as result;