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

### Next Development Priority (Phase 2)
🔄 **Analytics Dashboard** - Data visualization with charts
📋 **User Management** - Admin panel for user approvals  
🧾 **PDF Invoice Generation** - Automated document creation

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