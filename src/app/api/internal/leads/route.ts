import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { leads } from '@/lib/schema';
import { verifyToken } from '@/lib/internal-auth';
import { internalLeadSchema } from '@/lib/schema-validation';
import { and, eq, isNull, sql } from 'drizzle-orm';

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
    const normalizedEmail = normalizeEmail(leadData.email);
    const normalizedName = normalizeText(leadData.name);
    const normalizedCompany = normalizeNullableText(leadData.company);
    const normalizedSource = normalizeNullableText(leadData.source);
    const normalizedNotes = normalizeNullableText(leadData.notes);
    const normalizedNextAction = normalizeNullableText(leadData.nextAction);

    const upsertResult = await db.transaction(async (tx) => {
      if (normalizedEmail) {
        await tx.execute(
          sql`SELECT pg_advisory_xact_lock(hashtext(${`internal-lead:${normalizedEmail}`}))`
        );

        const existingByEmail = await tx.query.leads.findFirst({
          where: sql`lower(${leads.email}) = ${normalizedEmail}`,
        });

        if (existingByEmail) {
          const [updated] = await tx
            .update(leads)
            .set(buildUpdateData(leadData, {
              name: normalizedName,
              email: normalizedEmail,
              company: normalizedCompany,
              source: normalizedSource,
              notes: normalizedNotes,
              nextAction: normalizedNextAction,
            }))
            .where(eq(leads.id, existingByEmail.id))
            .returning();

          return { lead: updated, action: 'updated' as const };
        }

        const [created] = await tx
          .insert(leads)
          .values(buildInsertData(leadData, {
            name: normalizedName,
            email: normalizedEmail,
            company: normalizedCompany,
            source: normalizedSource,
            notes: normalizedNotes,
            nextAction: normalizedNextAction,
          }))
          .returning();

        return { lead: created, action: 'created' as const };
      }

      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext(${`internal-lead:${normalizedName}:${normalizedCompany ?? ''}`}))`
      );

      // Fallback for integrations that don't send email: attempt deterministic match.
      const existingByIdentity = await tx.query.leads.findFirst({
        where: and(
          sql`lower(${leads.name}) = ${normalizedName}`,
          normalizedCompany !== undefined
            ? normalizedCompany === null
              ? isNull(leads.company)
              : sql`lower(${leads.company}) = ${normalizedCompany}`
            : isNull(leads.company)
        ),
      });

      if (existingByIdentity) {
        const [updated] = await tx
          .update(leads)
          .set(buildUpdateData(leadData, {
            name: normalizedName,
            email: normalizedEmail,
            company: normalizedCompany,
            source: normalizedSource,
            notes: normalizedNotes,
            nextAction: normalizedNextAction,
          }))
          .where(eq(leads.id, existingByIdentity.id))
          .returning();

        return { lead: updated, action: 'updated' as const };
      }

      const [created] = await tx
        .insert(leads)
        .values(buildInsertData(leadData, {
          name: normalizedName,
          email: null,
          company: normalizedCompany,
          source: normalizedSource,
          notes: normalizedNotes,
          nextAction: normalizedNextAction,
        }))
        .returning();

      return { lead: created, action: 'created' as const };
    });

    const status = upsertResult.action === 'created' ? 201 : 200;
    return NextResponse.json(upsertResult, { status });
  } catch (error) {
    console.error('Internal create/update lead error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function normalizeText(value: string): string {
  return value.trim();
}

function normalizeNullableText(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeEmail(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function buildUpdateData(
  leadData: {
    stage: 'New' | 'Qualified' | 'Call_Scheduled' | 'Proposal_Sent' | 'Negotiation' | 'Won' | 'Lost';
    value?: number;
    nextActionAt?: string;
  },
  normalized: {
    name: string;
    email: string | null | undefined;
    company: string | null | undefined;
    source: string | null | undefined;
    notes: string | null | undefined;
    nextAction: string | null | undefined;
  }
): Record<string, unknown> {
  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
    name: normalized.name,
    stage: leadData.stage,
  };

  if (normalized.email !== undefined) updateData.email = normalized.email;
  if (normalized.company !== undefined) updateData.company = normalized.company;
  if (normalized.source !== undefined) updateData.source = normalized.source;
  if (leadData.value !== undefined) updateData.value = leadData.value;
  if (normalized.notes !== undefined) updateData.notes = normalized.notes;
  if (normalized.nextAction !== undefined) updateData.nextAction = normalized.nextAction;
  if (leadData.nextActionAt !== undefined) {
    updateData.nextActionAt = leadData.nextActionAt ? new Date(leadData.nextActionAt) : null;
  }

  return updateData;
}

function buildInsertData(
  leadData: {
    stage: 'New' | 'Qualified' | 'Call_Scheduled' | 'Proposal_Sent' | 'Negotiation' | 'Won' | 'Lost';
    value?: number;
    nextActionAt?: string;
  },
  normalized: {
    name: string;
    email: string | null | undefined;
    company: string | null | undefined;
    source: string | null | undefined;
    notes: string | null | undefined;
    nextAction: string | null | undefined;
  }
) {
  return {
    name: normalized.name,
    email: normalized.email ?? null,
    company: normalized.company ?? null,
    source: normalized.source ?? null,
    stage: leadData.stage,
    value: leadData.value ?? null,
    notes: normalized.notes ?? null,
    nextAction: normalized.nextAction ?? null,
    nextActionAt: leadData.nextActionAt ? new Date(leadData.nextActionAt) : null,
  };
}
