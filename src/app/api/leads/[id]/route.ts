import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { leads, touches } from '@/lib/schema';
import { requireAuth, getSession } from '@/lib/auth';
import { updateLeadSchema } from '@/lib/schema-validation';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const leadIdSchema = z.string().uuid();
const csrfBodySchema = z.object({
  csrfToken: z.string().min(1),
});

// GET /api/leads/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(request);
    const leadIdResult = leadIdSchema.safeParse(params.id);
    if (!leadIdResult.success) {
      return NextResponse.json({ error: 'Invalid lead id' }, { status: 400 });
    }

    const leadId = leadIdResult.data;

    const lead = await db.query.leads.findFirst({
      where: eq(leads.id, leadId),
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const leadTouches = await db.query.touches.findMany({
      where: eq(touches.leadId, leadId),
      orderBy: (touches, { desc }) => [desc(touches.createdAt)],
    });

    return NextResponse.json({ lead: { ...lead, touches: leadTouches } });
  } catch (error) {
    console.error('Get lead error:', error);
    
    if ((error as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/leads/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(request);
    const session = await getSession(request);
    const leadIdResult = leadIdSchema.safeParse(params.id);
    if (!leadIdResult.success) {
      return NextResponse.json({ error: 'Invalid lead id' }, { status: 400 });
    }

    const leadId = leadIdResult.data;

    const body = await request.json();

    // Validate CSRF
    if (body.csrfToken !== session.csrfToken) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }

    // Validate input
    const result = updateLeadSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.format() },
        { status: 400 }
      );
    }

    const updateData = result.data;

    // Check if lead exists
    const existing = await db.query.leads.findFirst({
      where: eq(leads.id, leadId),
    });

    if (!existing) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Build update object
    const update: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (updateData.name !== undefined) update.name = updateData.name;
    if (updateData.email !== undefined) update.email = updateData.email;
    if (updateData.company !== undefined) update.company = updateData.company;
    if (updateData.source !== undefined) update.source = updateData.source;
    if (updateData.stage !== undefined) update.stage = updateData.stage;
    if (updateData.value !== undefined) update.value = updateData.value;
    if (updateData.notes !== undefined) update.notes = updateData.notes;
    if (updateData.nextAction !== undefined) update.nextAction = updateData.nextAction;
    if (updateData.nextActionAt !== undefined) {
      update.nextActionAt = updateData.nextActionAt ? new Date(updateData.nextActionAt) : null;
    }

    const [updated] = await db
      .update(leads)
      .set(update)
      .where(eq(leads.id, leadId))
      .returning();

    return NextResponse.json({ lead: updated });
  } catch (error) {
    console.error('Update lead error:', error);
    
    if ((error as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/leads/[id] (soft archive)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(request);
    const session = await getSession(request);
    const leadIdResult = leadIdSchema.safeParse(params.id);
    if (!leadIdResult.success) {
      return NextResponse.json({ error: 'Invalid lead id' }, { status: 400 });
    }

    const leadId = leadIdResult.data;
    const body = await request.json().catch(() => null);
    const csrfResult = csrfBodySchema.safeParse(body);
    if (!csrfResult.success || csrfResult.data.csrfToken !== session.csrfToken) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }

    const existing = await db.query.leads.findFirst({
      where: eq(leads.id, leadId),
    });

    if (!existing) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (existing.archivedAt) {
      return NextResponse.json({ lead: existing });
    }

    const [archived] = await db
      .update(leads)
      .set({
        archivedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(leads.id, leadId))
      .returning();

    return NextResponse.json({ lead: archived });
  } catch (error) {
    console.error('Archive lead error:', error);

    if ((error as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
