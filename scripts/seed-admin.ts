#!/usr/bin/env tsx
/**
 * Seed admin user - ONE TIME USE
 * Run this after initial database setup to create the first user
 * Usage: OPENCLAW_TOKEN=xxx BOOTSTRAP_EMAIL=admin@example.com BOOTSTRAP_PASSWORD=xxx npx tsx scripts/seed-admin.ts
 */

import 'dotenv/config';
import { db } from '../src/lib/db';
import { users, openclawTokens } from '../src/lib/schema';
import { hashPassword } from '../src/lib/auth';
import { hashToken } from '../src/lib/internal-auth';

async function seed() {
  const email = process.env.BOOTSTRAP_EMAIL;
  const password = process.env.BOOTSTRAP_PASSWORD;
  const openclawToken = process.env.OPENCLAW_TOKEN;

  if (!email || !password) {
    console.error('Error: BOOTSTRAP_EMAIL and BOOTSTRAP_PASSWORD environment variables required');
    process.exit(1);
  }

  if (!openclawToken) {
    console.error('Warning: OPENCLAW_TOKEN not set. CLI scripts will not work until you create one.');
  }

  try {
    // Check if user already exists
    const existing = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, email),
    });

    if (existing) {
      console.log('Admin user already exists:', email);
      process.exit(0);
    }

    // Create admin user
    const passwordHash = await hashPassword(password);
    const [user] = await db
      .insert(users)
      .values({
        email: email.toLowerCase().trim(),
        passwordHash,
      })
      .returning();

    console.log('✓ Admin user created:', user.email);

    // Create OpenClaw token if provided
    if (openclawToken) {
      const existingToken = await db.query.openclawTokens.findFirst({
        where: (tokens, { eq }) => eq(tokens.tokenHash, hashToken(openclawToken)),
      });

      if (!existingToken) {
        const [token] = await db
          .insert(openclawTokens)
          .values({
            tokenHash: hashToken(openclawToken),
            name: 'CLI Access',
          })
          .returning();

        console.log('✓ OpenClaw token created');
      }
    }

    console.log('\nSetup complete! You can now log in to Pipeline Brain.');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seed();
