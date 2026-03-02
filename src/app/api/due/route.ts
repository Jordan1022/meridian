import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { leads } from '@/lib/schema';
import { requireAuth } from '@/lib/auth';
import { lte, gte, and, isNotNull, isNull } from 'drizzle-orm';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const dueQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(7),
  offset: z.coerce.number().int().min(-365).max(365).default(0),
});

// GET /api/due?days=7&offset=0
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const queryResult = dueQuerySchema.safeParse({
      days: searchParams.get('days') ?? '7',
      offset: searchParams.get('offset') ?? '0',
    });

    if (!queryResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: queryResult.error.format() },
        { status: 400 }
      );
    }

    const { days, offset } = queryResult.data;

    const start = new Date();
    start.setDate(start.getDate() + offset);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(start);
    end.setDate(end.getDate() + days);

    const dueLeads = await db.query.leads.findMany({
      where: and(
        isNull(leads.archivedAt),
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
