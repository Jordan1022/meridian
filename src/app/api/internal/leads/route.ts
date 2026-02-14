import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { leads } from '@/lib/schema';
import { verifyToken } from '@/lib/internal-auth';
import { internalLeadSchema } from '@/lib/schema-validation';
import { eq } from 'drizzle-orm';

// POST /api/internal/leads - Create or update lead
export async function POST(request: NextRequest) {
  try {
    // Verify token
    const token = request.headers.get('X-OPENCLAW-TOKEN');
    if (!token || !(await verifyToken(token))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate input
    const result = internalLeadSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.format() },
        { status: 400 }
      );
    }

    const leadData = result.data;

    // Check if lead exists by email
    let existingLead = null;
    if (leadData.email) {
      existingLead = await db.query.leads.findFirst({
        where: eq(leads.email, leadData.email),
      });
    }

    if (existingLead) {
      // Update existing lead
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (leadData.name) updateData.name = leadData.name;
      if (leadData.company !== undefined) updateData.company = leadData.company;
      if (leadData.source !== undefined) updateData.source = leadData.source;
      if (leadData.stage) updateData.stage = leadData.stage;
      if (leadData.value !== undefined) updateData.value = leadData.value;
      if (leadData.notes !== undefined) updateData.notes = leadData.notes;
      if (leadData.nextAction !== undefined) updateData.nextAction = leadData.nextAction;
      if (leadData.nextActionAt) updateData.nextActionAt = new Date(leadData.nextActionAt);

      const [updated] = await db
        .update(leads)
        .set(updateData)
        .where(eq(leads.id, existingLead.id))
        .returning();

      return NextResponse.json({ lead: updated, action: 'updated' });
    }

    // Create new lead
    const [newLead] = await db
      .insert(leads)
      .values({
        name: leadData.name,
        email: leadData.email || null,
        company: leadData.company || null,
        source: leadData.source || null,
        stage: leadData.stage,
        value: leadData.value || null,
        notes: leadData.notes || null,
        nextAction: leadData.nextAction || null,
        nextActionAt: leadData.nextActionAt ? new Date(leadData.nextActionAt) : null,
      })
      .returning();

    return NextResponse.json({ lead: newLead, action: 'created' }, { status: 201 });
  } catch (error) {
    console.error('Internal create/update lead error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
