import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { leads } from '@/lib/schema';
import { verifyToken } from '@/lib/internal-auth';
import { lte, gte, and, isNotNull } from 'drizzle-orm';

// GET /api/internal/due?days=7
export async function GET(request: NextRequest) {
  try {
    // Verify token
    const token = request.headers.get('X-OPENCLAW-TOKEN');
    if (!token || !(await verifyToken(token))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7', 10);

    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);

    const dueLeads = await db.query.leads.findMany({
      where: and(
        isNotNull(leads.nextActionAt),
        gte(leads.nextActionAt, now),
        lte(leads.nextActionAt, future)
      ),
      orderBy: (leads, { asc }) => [asc(leads.nextActionAt)],
    });

    return NextResponse.json({ leads: dueLeads });
  } catch (error) {
    console.error('Internal get due leads error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
