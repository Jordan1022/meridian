import { db } from './db';
import { openclawTokens } from './schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

// Hash token using SHA-256 (for constant-time comparison)
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Verify OpenClaw API token
export async function verifyToken(token: string): Promise<boolean> {
  const tokenHash = hashToken(token);

  const record = await db.query.openclawTokens.findFirst({
    where: eq(openclawTokens.tokenHash, tokenHash),
  });

  if (!record) return false;

  // Update last used timestamp
  await db
    .update(openclawTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(openclawTokens.id, record.id));

  return true;
}

// Create a new token (for bootstrap)
export async function createToken(name: string, token: string) {
  const tokenHash = hashToken(token);

  return db.insert(openclawTokens).values({
    tokenHash,
    name,
  });
}
