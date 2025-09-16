-- 수거 기록 테이블 생성 (메인 비즈니스 로직)
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

COMMENT ON TABLE public.collections IS '농산물 수거 기록 관리 테이블';
COMMENT ON COLUMN public.collections.id IS '수거 기록 고유 ID';
COMMENT ON COLUMN public.collections.user_id IS '수거 담당자 ID';
COMMENT ON COLUMN public.collections.producer_name IS '생산자 이름';
COMMENT ON COLUMN public.collections.product_type IS '농산물 종류 (사과, 감, 깻잎)';
COMMENT ON COLUMN public.collections.product_variety IS '농산물 품종';
COMMENT ON COLUMN public.collections.box_weight IS '박스 중량 (5kg, 10kg 등)';
COMMENT ON COLUMN public.collections.quantity IS '수량 (박스 개수)';
COMMENT ON COLUMN public.collections.market IS '도착 시장';
COMMENT ON COLUMN public.collections.region IS '생산 지역';
COMMENT ON COLUMN public.collections.reception_date IS '수거 예정일';
COMMENT ON COLUMN public.collections.status IS '처리 상태 (pending, completed)';