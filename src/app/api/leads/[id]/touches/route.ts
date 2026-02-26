import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { leads, touches } from '@/lib/schema';
import { requireAuth, getSession } from '@/lib/auth';
import { createTouchSchema } from '@/lib/schema-validation';
import { eq } from 'drizzle-orm';

// POST /api/leads/[id]/touches
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(request);
    const session = await getSession(request);

    const body = await request.json();

    // Validate CSRF
    if (body.csrfToken !== session.csrfToken) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }

    // Validate input
    const result = createTouchSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.format() },
        { status: 400 }
      );
    }

    const touchData = result.data;

    const newTouch = await db.transaction(async (tx) => {
      // Check if lead exists
      const lead = await tx.query.leads.findFirst({
        where: eq(leads.id, params.id),
      });

      if (!lead) {
        return null;
      }

      // Create touch
      const [createdTouch] = await tx
        .insert(touches)
        .values({
          leadId: params.id,
          channel: touchData.channel,
          summary: touchData.summary,
        })
        .returning();

      // Update lead with last touch and optional next action
      const updateData: Record<string, unknown> = {
        lastTouchAt: new Date(),
        updatedAt: new Date(),
      };

      if (touchData.nextAction !== undefined) {
        updateData.nextAction = touchData.nextAction;
      }

      if (touchData.nextActionAt !== undefined) {
        updateData.nextActionAt = touchData.nextActionAt ? new Date(touchData.nextActionAt) : null;
      }

      await tx
        .update(leads)
        .set(updateData)
        .where(eq(leads.id, params.id));

      return createdTouch;
    });

    if (!newTouch) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({ touch: newTouch }, { status: 201 });
  } catch (error) {
    console.error('Create touch error:', error);
    
    if ((error as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
