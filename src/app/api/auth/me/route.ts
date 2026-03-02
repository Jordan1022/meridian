import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/auth/me
export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session.userId || !session.email || !session.csrfToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    user: { id: session.userId, email: session.email },
    csrfToken: session.csrfToken,
  });
}
