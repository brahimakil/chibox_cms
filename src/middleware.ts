import { NextRequest, NextResponse } from 'next/server';

// Define public routes that don't require authentication
const publicRoutes: string[] = [
  '/login',
  '/register',
];

// Define protected routes that require authentication  
// const protectedRoutes: string[] = [
//   '/dashboard',
//   '/categories',
//   '/customers',
//   '/orders',
//   '/products',
//   '/notifications',
//   '/sync',
//   '/home-screen',
// ];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const token = request.cookies.get('auth-token')?.value;
  
  // Log to verify middleware is running (check SERVER terminal, not browser console)
  console.log(`[MIDDLEWARE] ${pathname} | Token: ${token ? 'YES' : 'NO'}`);

  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  
  // NO TOKEN - Block everything except public routes
  if (!token) {
    if (isPublicRoute) {
      return NextResponse.next();
    }
    // Redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // HAS TOKEN - Redirect from login/register to dashboard
  if (token && isPublicRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Allow access
  return NextResponse.next();
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

