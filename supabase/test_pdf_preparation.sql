-- 📄 PDF 송품장 테스트를 위한 데이터 준비
-- 일부 수거 기록을 '완료' 상태로 변경하고 오늘 날짜로 설정

-- 현재 상태 확인
SELECT 
    '📊 현재 수거 기록 상태' as info,
    status,
    COUNT(*) as count
FROM public.collections
GROUP BY status;

-- 테스트용 데이터 업데이트 (오늘 날짜로 설정하고 완료 처리)
UPDATE public.collections 
SET 
    status = 'completed',
    reception_date = CURRENT_DATE,
    updated_at = CURRENT_TIMESTAMP
WHERE producer_name IN ('김사과농장', '이과수농원')
AND status = 'pending';

-- 추가로 다른 품목도 완료 처리 (다양한 PDF 테스트를 위해)
UPDATE public.collections 
SET 
    status = 'completed',
    reception_date = CURRENT_DATE,
    updated_at = CURRENT_TIMESTAMP
WHERE producer_name = '박감농장'
AND product_type = '감'
AND status = 'pending';

-- 업데이트 후 상태 확인
SELECT 
    '✅ 업데이트 후 상태' as info,
    status,
    COUNT(*) as count
FROM public.collections
GROUP BY status;

-- PDF 생성에 필요한 완료된 기록 확인
SELECT 
    '📋 PDF 생성 대상 (오늘 완료된 항목)' as info,
    market,
    product_type,
    COUNT(*) as collection_count,
    STRING_AGG(producer_name, ', ') as producers
FROM public.collections
WHERE status = 'completed' 
AND reception_date = CURRENT_DATE
GROUP BY market, product_type
ORDER BY market, product_type;

-- 상세 완료 기록 조회 (디버깅용)
SELECT 
    '📝 완료된 수거 기록 상세' as info,
    producer_name,
    product_type,
    product_variety,
    box_weight,
    quantity,
    market,
    region,
    reception_date,
    status
FROM public.collections
WHERE status = 'completed' 
AND reception_date = CURRENT_DATE
ORDER BY market, product_type, producer_name;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎯 PDF 테스트 준비 완료!';
    RAISE NOTICE '📄 이제 /delivery-notes 페이지에서 PDF 다운로드를 시도해보세요.';
    RAISE NOTICE '🔍 완료된 항목들이 시장별/품목별로 그룹화되어 표시될 예정입니다.';
    RAISE NOTICE '';
END $$;