// coinsage/src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/favicon.ico',
  '/_next',
];

// Verify a JWT using Web Crypto (HMAC-SHA256). Returns { id, email } if valid.
async function verifyToken(
  token: string,
  secret: string
): Promise<{ id: string; email: string } | null> {
  try {
    const encoder = new TextEncoder();
    const secretKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    ); 

    // Split JWT into [header, payload, signature]
    const [header, payload, signature] = token.split('.');
    const signatureBytes = Uint8Array.from(
      atob(signature.replace(/-/g, '+').replace(/_/g, '/')),
      (c) => c.charCodeAt(0)
    );
    const data = encoder.encode(`${header}.${payload}`);

    // Verify signature
    const isValid = await crypto.subtle.verify(
      'HMAC',
      secretKey,
      signatureBytes,
      data
    );
    if (!isValid) return null; 
    // Decode payload, which should be JSON with { id, email, iat, exp }
    const decodedPayload = JSON.parse(atob(payload));
    return {
      id: decodedPayload.id,
      email: decodedPayload.email,
    };
  } catch (error) {
    console.error('JWT Verification Error:', error);
    return null;
  }
}

export async function middleware(req: NextRequest) {
  // Convert cookies to a plain object for logging; RequestCookies has getAll(), not entries()
  const cookieArray = req.cookies.getAll(); 
  const cookieObject = cookieArray.reduce((acc, { name, value }) => {
    acc[name] = value;
    return acc;
  }, {} as Record<string, string>); 

  // console.log('** Middleware Triggered **');
  // console.log('Cookies:', JSON.stringify(cookieObject)); 
  // console.log('Authorization header:', req.headers.get('authorization')); 

  const { pathname } = req.nextUrl;

  // Allow unauthenticated access to public paths
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Try cookie first, then Authorization header
  const accessToken =
    req.cookies.get('accessToken')?.value || // get('name') returns first matching cookie
    req.headers.get('authorization')?.split(' ')[1]; // split "Bearer <token>"
 

  // console.log('AccessToken used by middleware:', accessToken);

  if (!accessToken) {
    // No token → redirect to login (treated as 401 for API)
    return NextResponse.redirect(new URL('/api/auth/login', req.url));
  }

  // Verify the JWT
  const payload = await verifyToken(accessToken, process.env.JWT_SECRET!);
  if (!payload?.id) {
    // console.log('Invalid token payload:', payload);
    return NextResponse.redirect(new URL('/api/auth/login', req.url)); 
  }

  // Inject x-user-id / x-user-email into headers so downstream routes can read them
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-user-id', payload.id);
  requestHeaders.set('x-user-email', payload.email);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/api/:path*', '/dashboard/:path*'],
};
