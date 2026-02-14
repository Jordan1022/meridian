#!/usr/bin/env tsx
/**
 * Create or update lead via CLI
 * Usage: OPENCLAW_TOKEN=xxx npx tsx scripts/create-or-update-lead.ts --name "John Doe" --email "john@example.com" --stage "New"
 */

import 'dotenv/config';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const TOKEN = process.env.OPENCLAW_TOKEN;

if (!TOKEN) {
  console.error('Error: OPENCLAW_TOKEN environment variable required');
  process.exit(1);
}

// Type assertion since we checked above
const AUTH_TOKEN: string = TOKEN;

// Parse arguments
const args: Record<string, string> = {};
for (let i = 2; i < process.argv.length; i += 2) {
  const key = process.argv[i].replace(/^--/, '');
  const value = process.argv[i + 1];
  if (key && value) args[key] = value;
}

async function createOrUpdateLead() {
  const body: Record<string, unknown> = {};

  if (args.name) body.name = args.name;
  if (args.email) body.email = args.email;
  if (args.company) body.company = args.company;
  if (args.source) body.source = args.source;
  if (args.stage) body.stage = args.stage;
  if (args.value) body.value = parseInt(args.value, 10);
  if (args.notes) body.notes = args.notes;
  if (args.nextAction) body.nextAction = args.nextAction;
  if (args.nextActionAt) body.nextActionAt = args.nextActionAt;

  if (!body.name) {
    console.error('Error: --name is required');
    process.exit(1);
  }

  try {
    const response = await fetch(`${API_URL}/api/internal/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-OPENCLAW-TOKEN': AUTH_TOKEN,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Error:', data.error || 'Request failed');
      process.exit(1);
    }

    console.log(`✓ Lead ${data.action}: ${data.lead.name} (${data.lead.id})`);
  } catch (error) {
    console.error('Request failed:', error);
    process.exit(1);
  }
}

createOrUpdateLead();
