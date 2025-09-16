-- 시장/위치 정보 테이블 생성
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

COMMENT ON TABLE public.markets IS '시장/위치 정보 관리 테이블';
COMMENT ON COLUMN public.markets.id IS '시장 고유 ID';
COMMENT ON COLUMN public.markets.name IS '시장 이름';
COMMENT ON COLUMN public.markets.location IS '시장 위치/주소';
COMMENT ON COLUMN public.markets.is_active IS '활성화 상태';