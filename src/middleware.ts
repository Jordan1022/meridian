import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Security middleware
export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const appOrigin = getAppOrigin();
  const requestOrigin = request.headers.get('origin');
  const allowedOrigin =
    appOrigin && requestOrigin && requestOrigin === appOrigin ? requestOrigin : null;

  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self';"
  );

  // CORS for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Handle preflight OPTIONS request
    if (request.method === 'OPTIONS') {
      if (requestOrigin && appOrigin && requestOrigin !== appOrigin) {
        return new NextResponse(null, { status: 403 });
      }

      const headers: Record<string, string> = {
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-CSRF-Token, X-OPENCLAW-TOKEN, X-Openclaw-Token',
        'Access-Control-Max-Age': '86400',
      };

      if (allowedOrigin) {
        headers['Access-Control-Allow-Origin'] = allowedOrigin;
        headers['Access-Control-Allow-Credentials'] = 'true';
        headers.Vary = 'Origin';
      }

      return new NextResponse(null, {
        status: 204,
        headers,
      });
    }

    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token, X-OPENCLAW-TOKEN, X-Openclaw-Token');
    if (allowedOrigin) {
      response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Vary', 'Origin');
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

function getAppOrigin(): string | null {
  if (!process.env.APP_URL) return null;
  try {
    return new URL(process.env.APP_URL).origin;
  } catch {
    return null;
  }
}
