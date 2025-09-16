-- 분석용 뷰 생성

-- 1. 일별 수거 통계 뷰
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

-- 2. 생산자별 통계 뷰
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

-- 3. 시장별 통계 뷰  
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

-- 4. 시장-지역 매핑 뷰
CREATE OR REPLACE VIEW public.market_regions AS
SELECT DISTINCT
    m.id,
    m.name as market_name,
    c.region
FROM public.markets m
LEFT JOIN public.collections c ON m.name = c.market
WHERE c.region IS NOT NULL
ORDER BY m.name, c.region;

-- 뷰에 대한 설명 추가
COMMENT ON VIEW public.daily_collection_stats IS '일별 수거 통계 - 날짜, 품목별 수거 현황';
COMMENT ON VIEW public.producer_stats IS '생산자별 통계 - 생산자별 수거 실적 및 품목';  
COMMENT ON VIEW public.market_stats IS '시장별 통계 - 시장별 수거 현황 및 지역 분포';
COMMENT ON VIEW public.market_regions IS '시장-지역 매핑 - 시장과 연결된 지역 정보';