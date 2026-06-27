/**
 * Security headers applied to every response.
 *
 * The CSP is scoped to exactly the origins Saathi talks to (Firebase Auth +
 * Firestore, and the Gemini API). 'unsafe-inline'/'unsafe-eval' are required by
 * Next.js's runtime; everything else is locked to 'self'.
 */
import { NextResponse } from 'next/server';

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://generativelanguage.googleapis.com",
  "frame-src 'self' https://*.firebaseapp.com",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

export function middleware() {
  const res = NextResponse.next();
  res.headers.set('Content-Security-Policy', CSP);
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), geolocation=(), microphone=(self)');
  res.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload',
  );
  return res;
}

export const config = {
  // Apply to everything except Next internals and static assets.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
