import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { leads } from '@/lib/schema';
import { requireAuth } from '@/lib/auth';
import { lte, gte, and, isNotNull } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// GET /api/due?days=7&offset=0
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const start = new Date();
    start.setDate(start.getDate() + offset);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(start);
    end.setDate(end.getDate() + days);

    const dueLeads = await db.query.leads.findMany({
      where: and(
        isNotNull(leads.nextActionAt),
        gte(leads.nextActionAt, start),
        lte(leads.nextActionAt, end)
      ),
      orderBy: (leads, { asc }) => [asc(leads.nextActionAt)],
    });

    return NextResponse.json({ 
      leads: dueLeads,
      startDate: start.toISOString(),
      endDate: end.toISOString()
    });
  } catch (error) {
    console.error('Get due leads error:', error);
    
    if ((error as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
