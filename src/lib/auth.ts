import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import { db } from './db';
import { users } from './schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

async function getArgon2() {
  return import('argon2');
}

// Password hashing with Argon2id
export async function hashPassword(password: string): Promise<string> {
  const argon2 = await getArgon2();
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const argon2 = await getArgon2();
  return argon2.verify(hash, password);
}

// Generate CSRF token
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Derive CSRF token from session-specific data and app secret
export function deriveCsrfToken(seed: string): string {
  if (!process.env.NEXTAUTH_SECRET) {
    throw new Error('NEXTAUTH_SECRET environment variable is required');
  }

  return crypto
    .createHash('sha256')
    .update(`${seed}:${process.env.NEXTAUTH_SECRET}`)
    .digest('hex');
}

// Verify user credentials
export async function verifyUser(email: string, password: string): Promise<{ id: string; email: string } | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase().trim()),
  });

  if (!user) return null;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;

  return { id: user.id, email: user.email };
}

// Verify NextAuth JWT session
export async function requireAuth(req: NextRequest): Promise<{ userId: string; email: string }> {
  const token = await getToken({ 
    req, 
    secret: process.env.NEXTAUTH_SECRET 
  });
  
  const userId = (token?.id as string | undefined) ?? token?.sub;

  if (!userId || !token?.email) {
    throw new Error('Unauthorized');
  }

  return { userId, email: token.email as string };
}

// Get session (for internal use)
export async function getSession(req: NextRequest) {
  const token = await getToken({ 
    req, 
    secret: process.env.NEXTAUTH_SECRET 
  });

  const userId = (token?.id as string | undefined) ?? token?.sub;
  const csrfSeed = token ? (token as { jti?: string }).jti ?? userId : undefined;
  
  return {
    userId,
    email: token?.email,
    csrfToken: csrfSeed ? deriveCsrfToken(csrfSeed) : null,
  };
}

// Verify CSRF token (stub - NextAuth handles this)
export function verifyCsrfToken(csrfToken: string, token: string): boolean {
  return csrfToken === token;
}

// Auth error response helper
export function authErrorResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
