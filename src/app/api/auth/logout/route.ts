import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// POST /api/auth/logout
export async function POST() {
  return NextResponse.json(
    {
      error: 'Deprecated endpoint. Use NextAuth signOut() on the client.',
    },
    { status: 410 }
  );
}
