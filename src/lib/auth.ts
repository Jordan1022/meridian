import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import * as bcrypt from 'bcryptjs';
import { db } from './db';
import { users } from './schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

// Password hashing with bcryptjs (portable across serverless runtimes)
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!hash.startsWith('$2a$') && !hash.startsWith('$2b$') && !hash.startsWith('$2y$')) {
    return false;
  }

  return bcrypt.compare(password, hash);
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
  const normalizedEmail = email.toLowerCase().trim();
  const user = await db.query.users.findFirst({
    where: eq(users.email, normalizedEmail),
  });

  if (user) {
    const valid = await verifyPassword(password, user.passwordHash);
    if (valid) {
      return { id: user.id, email: user.email };
    }
  }

  const bootstrapEmail = process.env.BOOTSTRAP_EMAIL?.toLowerCase().trim();
  const bootstrapPassword = process.env.BOOTSTRAP_PASSWORD;
  const isBootstrapLogin =
    !!bootstrapEmail &&
    !!bootstrapPassword &&
    normalizedEmail === bootstrapEmail &&
    password === bootstrapPassword;

  if (!isBootstrapLogin) {
    return null;
  }

  const newHash = await hashPassword(password);

  // If we found a user but bcrypt verification failed, migrate to bcrypt using bootstrap creds.
  if (user) {
    await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, user.id));
    return { id: user.id, email: user.email };
  }

  // If user doesn't exist yet, bootstrap-create it.
  const [createdUser] = await db
    .insert(users)
    .values({
      email: normalizedEmail,
      passwordHash: newHash,
    })
    .returning();

  return { id: createdUser.id, email: createdUser.email };
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
