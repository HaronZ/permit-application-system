import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Import security utilities
import { SECURITY_CONFIG, checkRateLimit, securityHeaders } from '@/lib/security';

// Rate limiting function using security utilities
function checkRateLimitMiddleware(ip: string): boolean {
  return checkRateLimit(ip, SECURITY_CONFIG.rateLimit.apiRequests, SECURITY_CONFIG.rateLimit.apiWindow);
}

// Clean up old rate limit records
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitStore.entries()) {
    if (record.resetTime < now) {
      rateLimitStore.delete(ip);
    }
  }
}, 60 * 1000); // Clean up every minute

// CORS check
function isAllowedOrigin(origin: string): boolean {
  return SECURITY_CONFIG.cors.allowedOrigins.includes(origin) || 
         SECURITY_CONFIG.cors.allowedOrigins.includes('*');
}

// Request validation
function validateRequest(req: NextRequest): { valid: boolean; error?: string } {
  const url = req.nextUrl.pathname;
  
  // Block suspicious requests
  if (url.includes('..') || url.includes('//')) {
    return { valid: false, error: 'Invalid URL path' };
  }
  
  // Validate content type for POST/PUT requests
  if (['POST', 'PUT'].includes(req.method)) {
    const contentType = req.headers.get('content-type');
    if (contentType && !contentType.includes('application/json') && !contentType.includes('multipart/form-data')) {
      return { valid: false, error: 'Invalid content type' };
    }
  }
  
  return { valid: true };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/api/health')
  ) {
    return NextResponse.next();
  }

  // Get client IP
  const ip = request.ip || 
             request.headers.get('x-forwarded-for')?.split(',')[0] || 
             request.headers.get('x-real-ip') || 
             'unknown';

  // Rate limiting
  if (!checkRateLimitMiddleware(ip)) {
    return new NextResponse(
      JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '900', // 15 minutes
        },
      }
    );
  }

  // Request validation
  const validation = validateRequest(request);
  if (!validation.valid) {
    return new NextResponse(
      JSON.stringify({ error: validation.error }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // CORS handling
  const origin = request.headers.get('origin');
  if (origin && !isAllowedOrigin(origin)) {
    return new NextResponse(
      JSON.stringify({ error: 'CORS not allowed' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': SECURITY_CONFIG.cors.allowedMethods.join(', '),
        'Access-Control-Allow-Headers': SECURITY_CONFIG.cors.allowedHeaders.join(', '),
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Add security headers
  const response = NextResponse.next();
  
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value as string);
  });

  // Add CORS headers for API routes
  if (pathname.startsWith('/api/')) {
    response.headers.set('Access-Control-Allow-Origin', origin || '*');
    response.headers.set('Access-Control-Allow-Methods', SECURITY_CONFIG.cors.allowedMethods.join(', '));
    response.headers.set('Access-Control-Allow-Headers', SECURITY_CONFIG.cors.allowedHeaders.join(', '));
  }

  // Add request ID for tracking
  response.headers.set('X-Request-ID', crypto.randomUUID());

  return response;
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
