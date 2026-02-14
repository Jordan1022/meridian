import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { leads } from '@/lib/schema';
import { requireAuth, getSession } from '@/lib/auth';
import { createLeadSchema } from '@/lib/schema-validation';
import { and, eq, ilike, gte, lte } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// GET /api/leads?stage=&q=&due=
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const stage = searchParams.get('stage');
    const q = searchParams.get('q');
    const due = searchParams.get('due');

    // Build query
    let conditions = [];

    if (stage && stage !== 'all') {
      // Cast to proper enum type - validated at runtime by the database
      conditions.push(eq(leads.stage, stage as typeof leads.stage.enumValues[number]));
    }

    if (q) {
      conditions.push(
        ilike(leads.name, `%${q}%`)
      );
    }

    if (due === 'week') {
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      conditions.push(lte(leads.nextActionAt, weekFromNow));
      conditions.push(gte(leads.nextActionAt, new Date()));
    }

    const results = await db.query.leads.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: (leads, { desc }) => [desc(leads.updatedAt)],
    });

    return NextResponse.json({ leads: results });
  } catch (error) {
    console.error('Get leads error:', error);
    
    if ((error as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/leads
export async function POST(request: NextRequest) {
  try {
    await requireAuth(request);
    const session = await getSession(request);

    const body = await request.json();

    // Validate CSRF
    if (body.csrfToken !== session.csrfToken) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }

    // Validate input
    const result = createLeadSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.format() },
        { status: 400 }
      );
    }

    const leadData = result.data;

    // Create lead
    const [newLead] = await db
      .insert(leads)
      .values({
        name: leadData.name,
        email: leadData.email,
        company: leadData.company,
        source: leadData.source,
        stage: leadData.stage,
        value: leadData.value,
        notes: leadData.notes,
        nextAction: leadData.nextAction,
        nextActionAt: leadData.nextActionAt ? new Date(leadData.nextActionAt) : null,
      })
      .returning();

    return NextResponse.json({ lead: newLead }, { status: 201 });
  } catch (error) {
    console.error('Create lead error:', error);
    
    if ((error as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
