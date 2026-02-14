import { z } from 'zod';

// Lead validation schemas
export const leadStageSchema = z.enum([
  'New',
  'Qualified',
  'Call_Scheduled',
  'Proposal_Sent',
  'Negotiation',
  'Won',
  'Lost',
]);

export const channelSchema = z.enum(['email', 'call', 'text', 'dm', 'meeting', 'other']);

export const createLeadSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().max(255).nullable(),
  company: z.string().max(255).nullable(),
  source: z.string().max(255).nullable(),
  stage: leadStageSchema.default('New'),
  value: z.number().int().nonnegative().nullable(),
  notes: z.string().max(10000).nullable(),
  nextAction: z.string().max(500).nullable(),
  nextActionAt: z.string().datetime().nullable(),
});

export const updateLeadSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().max(255).nullable().optional(),
  company: z.string().max(255).nullable().optional(),
  source: z.string().max(255).nullable().optional(),
  stage: leadStageSchema.optional(),
  value: z.number().int().nonnegative().nullable().optional(),
  notes: z.string().max(10000).nullable().optional(),
  nextAction: z.string().max(500).nullable().optional(),
  nextActionAt: z.string().datetime().nullable().optional(),
});

export const createTouchSchema = z.object({
  channel: channelSchema,
  summary: z.string().min(1).max(2000),
  nextAction: z.string().max(500).nullable().optional(),
  nextActionAt: z.string().datetime().nullable().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  csrfToken: z.string(),
});

// API key validation
export const internalLeadSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().max(255).optional(),
  company: z.string().max(255).optional(),
  source: z.string().max(255).optional(),
  stage: leadStageSchema.default('New'),
  value: z.number().int().nonnegative().optional(),
  notes: z.string().max(10000).optional(),
  nextAction: z.string().max(500).optional(),
  nextActionAt: z.string().datetime().optional(),
});
