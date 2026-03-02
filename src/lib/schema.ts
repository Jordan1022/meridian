import { pgTable, uuid, text, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';

// Enums
export const stageEnum = pgEnum('stage', [
  'New',
  'Qualified',
  'Call_Scheduled',
  'Proposal_Sent',
  'Negotiation',
  'Won',
  'Lost',
]);

export const channelEnum = pgEnum('channel', [
  'email',
  'call',
  'text',
  'dm',
  'meeting',
  'other',
]);

// Leads table
export const leads = pgTable('leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email'),
  company: text('company'),
  source: text('source'),
  stage: stageEnum('stage').notNull().default('New'),
  value: integer('value'),
  notes: text('notes'),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  lastTouchAt: timestamp('last_touch_at', { withTimezone: true }),
  nextAction: text('next_action'),
  nextActionAt: timestamp('next_action_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Touches table (activities/notes on leads)
export const touches = pgTable('touches', {
  id: uuid('id').primaryKey().defaultRandom(),
  leadId: uuid('lead_id')
    .notNull()
    .references(() => leads.id, { onDelete: 'cascade' }),
  channel: channelEnum('channel').notNull().default('other'),
  summary: text('summary').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Users table (single user for bootstrap only)
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// OpenClaw tokens table (for API access from scripts)
export const openclawTokens = pgTable('openclaw_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  tokenHash: text('token_hash').notNull().unique(),
  name: text('name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
});

// Types
export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type Touch = typeof touches.$inferSelect;
export type NewTouch = typeof touches.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type OpenclawToken = typeof openclawTokens.$inferSelect;
export type NewOpenclawToken = typeof openclawTokens.$inferInsert;
