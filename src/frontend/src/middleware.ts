import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/login'];

// Static assets and API routes to skip
const SKIP_ROUTES = ['/_next', '/api', '/favicon.ico'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static assets and API routes
  if (SKIP_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check if the route is public
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  // Skip middleware for admin routes (they have their own auth context)
  if (pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // Get auth token from cookie or localStorage (we check cookie for SSR)
  const authCookie = request.cookies.get('framer-auth');
  const isAuthenticated = !!authCookie?.value;

  // Redirect unauthenticated users to login
  if (!isAuthenticated && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from login
  if (isAuthenticated && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Redirect root to dashboard
  if (pathname === '/') {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } else {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
