import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { leads, touches } from '@/lib/schema';
import { verifyToken } from '@/lib/internal-auth';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const internalTouchSchema = z.object({
  channel: z.enum(['email', 'call', 'text', 'dm', 'meeting', 'other']).default('other'),
  summary: z.string().min(1).max(2000),
  nextAction: z.string().max(500).optional(),
  nextActionAt: z.string().datetime().optional(),
});
const leadIdSchema = z.string().uuid();

// POST /api/internal/leads/[id]/touches
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify token
    const token = request.headers.get('X-OPENCLAW-TOKEN');
    if (!token || !(await verifyToken(token))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const leadIdResult = leadIdSchema.safeParse(params.id);
    if (!leadIdResult.success) {
      return NextResponse.json({ error: 'Invalid lead id' }, { status: 400 });
    }

    const leadId = leadIdResult.data;

    const body = await request.json();

    // Validate input
    const result = internalTouchSchema.safeParse(body);
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
        where: eq(leads.id, leadId),
      });

      if (!lead) {
        return null;
      }

      if (lead.archivedAt) {
        throw new Error('Lead is archived');
      }

      // Create touch
      const [createdTouch] = await tx
        .insert(touches)
        .values({
          leadId,
          channel: touchData.channel,
          summary: touchData.summary,
        })
        .returning();

      // Update lead
      const updateData: Record<string, unknown> = {
        lastTouchAt: new Date(),
        updatedAt: new Date(),
      };

      if (touchData.nextAction !== undefined) {
        updateData.nextAction = touchData.nextAction;
      }

      if (touchData.nextActionAt !== undefined) {
        updateData.nextActionAt = new Date(touchData.nextActionAt);
      }

      await tx
        .update(leads)
        .set(updateData)
        .where(eq(leads.id, leadId));

      return createdTouch;
    });

    if (!newTouch) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({ touch: newTouch }, { status: 201 });
  } catch (error) {
    console.error('Internal create touch error:', error);

    if ((error as Error).message === 'Lead is archived') {
      return NextResponse.json({ error: 'Lead is archived' }, { status: 409 });
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
