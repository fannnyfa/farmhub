-- 사용자 테이블 생성 (인증 및 역할 관리)
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

COMMENT ON TABLE public.users IS '사용자 정보 관리 테이블';
COMMENT ON COLUMN public.users.id IS '사용자 고유 ID';
COMMENT ON COLUMN public.users.email IS '사용자 이메일 (로그인 ID)';
COMMENT ON COLUMN public.users.name IS '사용자 이름';
COMMENT ON COLUMN public.users.password_hash IS '암호화된 비밀번호';
COMMENT ON COLUMN public.users.role IS '사용자 역할 (admin, user)';
COMMENT ON COLUMN public.users.status IS '계정 상태 (pending, approved, rejected)';