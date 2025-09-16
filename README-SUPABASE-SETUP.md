# 🍎 팜허브 사과 물류 관리 시스템 - Supabase 백엔드 설정 가이드

이 문서는 팜허브 사과 물류 관리 시스템의 Supabase 데이터베이스를 설정하는 방법을 안내합니다.

## 📋 개요

- **데이터베이스**: PostgreSQL (Supabase)
- **인증 시스템**: 커스텀 인증 (Supabase Auth 미사용)
- **보안**: RLS (Row Level Security) 적용
- **타입 안전성**: TypeScript 타입 자동 생성

## 🚀 빠른 설정

### 1단계: 전체 마이그레이션 실행

**옵션 A: 통합 스크립트 사용 (권장)**
```sql
-- supabase/run_migrations.sql 파일의 내용을 복사해서 Supabase SQL Editor에서 실행
```

**옵션 B: 개별 마이그레이션 실행**
```bash
# 각 마이그레이션 파일을 순서대로 실행
# 1. supabase/migrations/20250116000001_create_users_table.sql
# 2. supabase/migrations/20250116000002_create_markets_table.sql
# 3. supabase/migrations/20250116000003_create_collections_table.sql
# 4. supabase/migrations/20250116000004_create_analytics_views.sql
# 5. supabase/migrations/20250116000005_insert_initial_data.sql
# 6. supabase/migrations/20250116000006_setup_rls_policies.sql
```

### 2단계: TypeScript 타입 생성

```bash
# 타입 생성 스크립트 실행
npm run generate:types

# 또는 직접 실행
node scripts/generate-types.js
```

### 3단계: 환경 변수 확인

`.env.local` 파일에 Supabase 크리덴셜이 올바르게 설정되어 있는지 확인:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 📊 데이터베이스 스키마

### 핵심 테이블

#### 🧑‍💼 users (사용자 관리)
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',      -- 'admin' | 'user'
    status VARCHAR(50) DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### 🏪 markets (시장 정보)
```sql
CREATE TABLE markets (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### 📦 collections (수거 기록)
```sql
CREATE TABLE collections (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    producer_name VARCHAR(255) NOT NULL,
    product_type VARCHAR(50) DEFAULT '사과',    -- '사과' | '감' | '깻잎'
    product_variety VARCHAR(50),              -- 품종 정보
    box_weight VARCHAR(10) DEFAULT '10kg',    -- '5kg' | '10kg'
    quantity INTEGER,                         -- 박스 개수
    market VARCHAR(255),                      -- 도착 시장
    region VARCHAR(255),                      -- 생산 지역
    reception_date DATE,                      -- 수거 예정일
    status VARCHAR(50) DEFAULT 'pending',     -- 'pending' | 'completed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 분석용 뷰

#### 📈 daily_collection_stats
일별 수거 통계 (날짜, 품목별 집계)

#### 👨‍🌾 producer_stats  
생산자별 실적 통계

#### 🏪 market_stats
시장별 수거 현황

#### 🗺️ market_regions
시장-지역 매핑 정보

## 🔐 보안 설정

### RLS (Row Level Security) 정책

- **users**: 관리자는 모든 사용자 조회/수정, 일반 사용자는 자신의 정보만 접근
- **markets**: 승인된 사용자는 조회, 관리자만 수정
- **collections**: 사용자는 자신의 수거 기록만 관리, 관리자는 전체 접근

### 보안 함수

```sql
-- 현재 사용자 정보 조회
SELECT * FROM get_current_user();

-- 관리자 권한 확인
SELECT is_admin();

-- 승인된 사용자 확인  
SELECT is_approved_user();
```

## 🧪 테스트 데이터

### 기본 계정 (비밀번호: `password`)

| 이메일 | 이름 | 역할 | 상태 |
|--------|------|------|------|
| admin@farmhub.kr | 시스템 관리자 | admin | approved |
| user@farmhub.kr | 일반 사용자 | user | approved |  
| test@farmhub.kr | 테스트 사용자 | user | pending |

### 기본 시장 정보

- 가락시장 (서울특별시 송파구)
- 구리시장 (경기도 구리시)
- 성남시장 (경기도 성남시)
- 안성시장 (경기도 안성시)
- 수원시장 (경기도 수원시)
- 평택시장 (경기도 평택시)
- 용인시장 (경기도 용인시)
- 화성시장 (경기도 화성시)

### 샘플 수거 기록

- 김사과농장 → 가락시장 (완료)
- 이과수농원 → 구리시장 (완료)
- 박감농장 → 성남시장 (대기중)
- 최깻잎농원 → 안성시장 (대기중)
- 장사과마을 → 수원시장 (대기중)

## 🔧 개발 스크립트

### package.json 추가 스크립트

```json
{
  "scripts": {
    "generate:types": "node scripts/generate-types.js",
    "db:reset": "echo '데이터베이스를 초기화하려면 Supabase 대시보드에서 수동으로 진행하세요'",
    "db:migrate": "echo 'run_migrations.sql을 Supabase SQL Editor에서 실행하세요'"
  }
}
```

## 🚨 문제 해결

### 일반적인 문제

1. **RLS 정책 오류**
   - 모든 테이블에 RLS가 활성화되어 있는지 확인
   - auth.uid() 함수가 올바르게 작동하는지 테스트

2. **외래키 제약조건 오류**
   - 테이블 생성 순서가 올바른지 확인 (users → markets → collections)
   - 참조무결성 위배 데이터가 없는지 확인

3. **타입 불일치**
   - `npm run generate:types`로 최신 타입 생성
   - 데이터베이스 스키마와 TypeScript 타입 동기화

### 디버깅 쿼리

```sql
-- 테이블 존재 확인
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- 뷰 존재 확인
SELECT viewname FROM pg_views WHERE schemaname = 'public';

-- RLS 정책 확인
SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public';

-- 샘플 데이터 확인
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM markets;  
SELECT COUNT(*) FROM collections;
```

## 📚 추가 리소스

- [Supabase 공식 문서](https://supabase.com/docs)
- [PostgreSQL RLS 가이드](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [TypeScript 타입 생성](https://supabase.com/docs/guides/api/generating-types)

---

## 🎯 다음 단계

데이터베이스 설정이 완료되면:

1. **Phase 2 개발**: 분석 대시보드 구현
2. **사용자 관리 패널**: 관리자용 승인 시스템
3. **PDF 송장 생성**: 자동화된 문서 생성
4. **실시간 알림**: 수거 상태 변경 알림
5. **모바일 최적화**: PWA 기능 추가

---

*이 설정 가이드는 팜허브 사과 물류 관리 시스템의 백엔드 인프라를 완전히 구축하는 데 필요한 모든 단계를 포함합니다.*