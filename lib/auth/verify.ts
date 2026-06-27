/**
 * Keyless Firebase ID-token verification.
 *
 * Firebase issues RS256 JWTs signed by Google. We verify them against Google's
 * public JWKS — no service-account key needed (the project's org policy blocks
 * SA keys anyway, and this is cleaner + Vercel-friendly). Every API route calls
 * this before touching an LLM, so our endpoints are not open proxies.
 *
 * Checks performed by jwtVerify + our claims:
 *   - signature against Google's rotating public keys
 *   - iss === https://securetoken.google.com/<projectId>
 *   - aud === <projectId>
 *   - exp / iat validity
 *   - sub (the uid) present
 */
import { createRemoteJWKSet, jwtVerify } from 'jose';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || '';

const JWKS = createRemoteJWKSet(
  new URL(
    'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
  ),
);

export interface VerifiedUser {
  uid: string;
}

export async function verifyIdToken(token: string): Promise<VerifiedUser> {
  if (!PROJECT_ID) throw new Error('FIREBASE_PROJECT_ID not configured');
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: `https://securetoken.google.com/${PROJECT_ID}`,
    audience: PROJECT_ID,
  });
  if (!payload.sub) throw new Error('token missing sub');
  return { uid: payload.sub };
}

/** Extracts and verifies the bearer token from a request. Returns null if absent/invalid. */
export async function getUser(req: Request): Promise<VerifiedUser | null> {
  const header = req.headers.get('authorization') || '';
  const match = header.match(/^Bearer (.+)$/i);
  if (!match) return null;
  try {
    return await verifyIdToken(match[1]);
  } catch {
    return null;
  }
}
