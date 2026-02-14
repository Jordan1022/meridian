import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { deriveCsrfToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/auth/me
export async function GET(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const userId = (token?.id as string | undefined) ?? token?.sub;
  const csrfSeed = token ? (token as { jti?: string }).jti ?? userId : undefined;

  if (!token || !userId || !token.email || !csrfSeed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    user: { id: userId, email: token.email as string },
    csrfToken: deriveCsrfToken(csrfSeed),
  });
}
