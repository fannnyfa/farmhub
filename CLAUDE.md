# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

팜허브 사과 물류 관리 시스템 - Next.js 15 기반의 농산물 수거/물류 관리 웹 애플리케이션

**Key Technologies:**
- Next.js 15 with React 19 and Turbopack
- Supabase (PostgreSQL database + auth)  
- TypeScript
- Tailwind CSS v4 + shadcn/ui components
- Server/Client components architecture

## Development Commands

### Essential Commands
```bash
# Start development server (uses Turbopack)
npm run dev                    # Runs on localhost:3001 (not 3000)

# Build for production
npm run build                  # Uses Turbopack for faster builds

# Start production server  
npm run start

# Lint code
npm run lint
```

### Environment Setup
- Dev server runs on port **3001** (not 3000) due to port conflicts
- Requires `.env.local` with Supabase credentials
- Test accounts: admin@farmhub.kr / user@farmhub.kr (password: "password")

## Architecture & Structure

### Database Architecture (Supabase)
```
users         -> Authentication and user management with role-based access
collections   -> Core business logic - apple collection records
markets       -> Reference data for markets/locations
```

**Key Views for Analytics:**
- `daily_collection_stats` - Daily aggregated statistics
- `producer_stats` - Producer performance metrics  
- `market_stats` - Market analysis data

### Authentication System
- **Custom auth implementation** (not Supabase Auth)
- Uses localStorage + cookies for session management
- Role-based access: admin/user with approval workflow
- User approval system (pending/approved/rejected status)

### State Management Pattern
```
AuthContext -> Global user state and auth methods
Hooks (use-collections) -> Business logic and data fetching
Components -> UI presentation layer
```

### Component Architecture
```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout with AuthProvider
│   ├── page.tsx          # Main dashboard (collection management)
│   ├── login/            # Authentication pages
│   └── register/
├── components/
│   ├── auth/             # Login/register forms
│   ├── collections/      # Core business components (CRUD)
│   ├── layout/           # Navigation and layout components
│   └── ui/               # shadcn/ui design system components
├── contexts/             # React Context providers
├── hooks/                # Custom hooks for data operations
└── lib/                  # Utilities and configurations
```

### Data Flow Pattern
1. **Server Components**: Initial data fetching and SEO
2. **Client Components**: Interactive features and real-time updates
3. **Custom Hooks**: Encapsulate business logic and Supabase operations
4. **Context**: Global state management (auth, user preferences)

## Key Business Logic

### Collection Management (Core Feature)
- **States**: pending → completed workflow
- **Data**: Producer info, market assignment, quantity tracking, invoice generation
- **Real-time**: Dashboard statistics with live updates
- **Filtering**: By date, status, market, producer

### Invoice System
- Auto-generated invoice numbers: `INV-YYYYMMDD-0001`
- Sequential numbering per day
- PDF generation capability (planned)

### Product Types & Varieties
```typescript
ProductType = '사과' | '감' | '깻잎'
BoxWeight = '5kg' | '10kg'
ProductVariety = {
  사과: null,
  감: '단감' | '약시' | '대봉',
  깻잎: '정품' | '바라'
}
```

## Development Notes

### Current Status (Phase 1 Complete)
✅ Authentication system with user approval workflow  
✅ Collection CRUD operations with real-time dashboard
✅ Responsive UI with shadcn/ui components
✅ Database schema with statistics views
✅ Supabase backend setup with RLS policies
✅ PDF generation functionality working with Korean fonts

### Next Development Priority (Phase 3)
📊 **Analytics Dashboard** - Data visualization with charts (우선순위 1)
📋 **User Management** - Admin panel for user approvals
🔧 **PDF 기능 확장** - 다양한 레포트 및 통계 PDF 생성

## Phase 2 Development - PDF 운임료 계산 시스템 ✅ 완료

### 📋 개발 요구사항
**목표**: 송품장 PDF에 품목별/무게별 운임료 자동 계산 기능 추가

**PDF 생성 방식**: 
- 공판장별 + 품목별로 개별 PDF 생성됨 (현재 구현됨)
- 예: 중앙청과_사과.pdf, 중앙청과_감.pdf, 중앙청과_깻잎.pdf

**계산 섹션 위치**:
- 기존 테이블 (생산자/품명/규격/계) 하단
- 계좌번호 정보 (강민준 기사...) 상단

### 💰 운임료 체계 (확정)
```javascript
const shippingRates = {
  사과: { 
    '10kg': 1000, 
    '5kg': 600 
  },
  감: { 
    '10kg': 1100,   // 단감, 대봉, 약시 모두 동일
    '5kg': 700 
  },
  깻잎: { 
    정품: 600,      // 무게 상관없이
    바라: 1000      // 무게 상관없이
  }
}
```

### 📊 계산 예시
**중앙청과_사과.pdf 내부**:
```
기존 테이블 (사과 관련 데이터만)
─────────────────────────
운임료 계산:
사과 10kg: 50개 × 1,000원 = 50,000원
사과 5kg: 30개 × 600원 = 18,000원
─────────────────────────
총 운임료: 68,000원

계좌번호: 농협 356-0724-8964-13...
```

### 🔧 기술적 구현 방향
- **기존 코드 기반**: `src/lib/pdf-utils.ts` 확장
- **데이터 활용**: Supabase의 `product_type`, `product_variety`, `box_weight`, `quantity`
- **계산 로직**: 각 PDF 그룹별로 해당 품목 운임료만 계산
- **레이아웃**: 기존 PDF 구조 유지하며 계산 섹션만 추가

### 📈 진행 상태
- ✅ 기본 PDF 기능 작동 확인 (한글 지원 포함)
- ✅ 운임료 체계 정의 완료
- ✅ 계산 로직 설계 완료  
- ✅ 레이아웃 위치 확정
- ✅ **구현 완료** - 운임료 계산 시스템 정상 작동
- ✅ **테이블 정렬 문제 해결** - 모든 텍스트 수직 중앙 정렬 완료

### 🚀 개발 완료
✅ PDF 운임료 계산 시스템 구현 완료
✅ PDF 테이블 정렬 최적화 완료

## PDF 테이블 정렬 및 레이아웃 수정 가이드

### 📁 핵심 파일 위치
- **주요 PDF 생성 파일**: `/src/lib/pdf-lib-utils.ts` 
- **백업 PDF 생성 파일**: `/src/lib/pdf-utils.ts` (jsPDF 버전, 한글 미지원)
- **PDF 선택 모달**: `/src/components/delivery/delivery-note-selection-modal.tsx`

### 🏗️ PDF 구조 분석
```
송품장 PDF 구조:
├── 헤더 섹션
│   ├── 제목: "송 품 장"
│   ├── 출하일시 & 밀양산내지소
│   └── 수신: [공판장명]
├── 데이터 테이블 (메인)
│   ├── 헤더 행: 생산자 | 품명 | 규격 | 계 (좌우 2열 구조)
│   └── 데이터 행들: 생산자 정보들 (최대 20행)
├── 운임료 계산 섹션 ⭐ 
│   ├── 품목별 계산식: "깻잎 정품: 150장 × 600원 = 90,000원"
│   └── 총 운임료: "총 운임료: 90,000원"
└── 계좌정보 섹션
    ├── 계좌번호: "농협 356-0724-8964-13 (강민준)"
    └── 전화번호: "H.P: 010-3444-8853"
```

### 🎯 테이블 정렬 문제 해결 방법

#### 1. Playwright를 통한 PDF 테스트 절차
```bash
# 1. 개발 서버 실행 (포트 3001)
npm run dev

# 2. Playwright로 브라우저 접속
# - http://localhost:3001 로 이동
# - admin@farmhub.kr / password 로 로그인
# - 송품장 출력 메뉴 진입
# - 그룹 선택 후 PDF 생성
# - 생성된 PDF 파일 분석
```

#### 2. 텍스트 위치 조정 핵심 포인트들

**A. 헤더 텍스트 조정** (line ~385):
```typescript
// 헤더 텍스트 Y 위치 조정
y: headerStartY + rowHeight/2 - 4  // -4로 아래로 이동
```

**B. 데이터 텍스트 조정** (line ~450):
```typescript
// 데이터 텍스트 Y 위치 조정  
y: currentY + rowHeight/2 - 3  // -3으로 아래로 이동
```

**C. 운임료 계산 텍스트 조정** ⭐ (line ~471):
```typescript
// 운임료 텍스트 시작 위치 조정
let textY = currentY + rowHeight - 16  // -16으로 아래로 이동 (최종 값)
```

**D. 계좌정보 텍스트 조정** (line ~564):
```typescript
// 계좌정보 텍스트 Y 위치 조정
y: currentY + rowHeight/2 - 3  // -3으로 아래로 이동
```

#### 3. Y 위치 조정 가이드라인

**수직 중앙 정렬 원리**:
- `rowHeight/2`: 셀 높이의 중간점
- `- N`: 텍스트를 N포인트만큼 아래로 이동 (양수일수록 아래로)
- 각 섹션별 최적 값이 다름 (폰트 크기, 레이아웃에 따라)

**조정 단계별 접근**:
1. **초기 값**: `rowHeight/2` (정확한 수학적 중앙)
2. **1차 조정**: `-2~-4` (시각적 중앙으로 조정)
3. **세밀 조정**: 사용자 피드백에 따라 ±1~2 추가 조정
4. **최종 확정**: Playwright PDF 생성으로 검증

#### 4. 문제 해결 시 체크리스트

✅ **문제 현상 파악**:
- [ ] 어떤 섹션의 텍스트가 문제인지 확인 (헤더/데이터/운임료/계좌)
- [ ] "위로 치우쳐짐" vs "아래로 치우쳐짐" 정확한 방향 파악

✅ **코드 수정**:
- [ ] `/src/lib/pdf-lib-utils.ts` 파일의 해당 섹션 찾기
- [ ] Y 위치 값 조정 (음수 값이 클수록 더 아래로)
- [ ] 한 번에 2-4 포인트씩 조정 권장

✅ **검증 과정**:
- [ ] Playwright로 새 PDF 생성
- [ ] 실제 PDF 파일에서 시각적 확인
- [ ] 필요시 추가 세밀 조정

#### 5. 한글 폰트 관련
- **폰트**: NanumGothic (나눔고딕) 사용
- **크기**: 헤더 13pt, 데이터 11pt, 운임료 11pt
- **로딩**: 사용자 제공 폰트 파일에서 로드 (4.6MB)

#### 6. 운임료 계산 시스템 (구현 완료)
```typescript
const shippingRates = {
  사과: { '10kg': 1000, '5kg': 600 },
  감: { '10kg': 1100, '5kg': 700 },
  깻잎: { 정품: 600, 바라: 1000 }
}
```

### 🔧 향후 PDF 수정 시 키워드
- "PDF 테이블 정렬 문제 해결해줘"
- "송품장 텍스트가 위/아래로 치우쳐져 있어"
- "운임료 계산 텍스트 위치 조정해줘"
- "Playwright로 PDF 테스트해줘"

### Known Issues
- RLS policies temporarily disabled (auth integration pending)
- Development server uses port 3001 instead of 3000
- Simple password authentication (hardcoded "password")

### Brand Guidelines  
- Primary color: Green-600 (#059669) - "brand" class in Tailwind
- Font: Inter font family
- Icons: Heroicons library
- Design system: shadcn/ui components

### Testing Approach
- Test accounts available in DEVELOPMENT.md
- Supabase local development environment setup
- Manual testing workflow documented

### Performance Considerations
- Turbopack enabled for faster development builds
- Next.js 15 Server Components for optimal loading
- Tailwind CSS v4 for minimal bundle size
- Image optimization with Next.js Image component

- 답변은 한국어로 해줘
- 전문 웹디자이너가 만든것처럼 이쁘게 해줘
- tailswind css, shadcn 으로 만들어줘
- pc, 테블릿, 모바일 모두 사용할 수 있게 반응형으로 해줘