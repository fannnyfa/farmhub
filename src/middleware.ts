import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // 공개 경로 (인증 없이 접근 가능)
  const publicPaths = ['/login', '/register']
  
  // 현재 경로가 공개 경로인지 확인
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path))
  
  // TODO: 실제 인증 확인 로직 구현 예정
  // 현재는 간단한 토큰 체크만 수행
  const isAuthenticated = request.cookies.get('auth-token')?.value
  
  // 인증이 필요한 페이지에 비인증 사용자가 접근하는 경우
  if (!isPublicPath && !isAuthenticated && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  // 이미 인증된 사용자가 로그인/회원가입 페이지에 접근하는 경우
  if (isPublicPath && isAuthenticated) {
    return NextResponse.redirect(new URL('/', request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}