#!/usr/bin/env tsx
/**
 * Log a touch on a lead via CLI
 * Usage: OPENCLAW_TOKEN=xxx npx tsx scripts/log-touch.ts --lead-id "uuid" --summary "Called back" --channel "call"
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

async function logTouch() {
  const leadId = args['lead-id'];
  const summary = args.summary;
  const channel = args.channel || 'other';
  const nextAction = args.nextAction;
  const nextActionAt = args.nextActionAt;

  if (!leadId) {
    console.error('Error: --lead-id is required');
    process.exit(1);
  }

  if (!summary) {
    console.error('Error: --summary is required');
    process.exit(1);
  }

  const body: Record<string, unknown> = {
    channel,
    summary,
  };

  if (nextAction) body.nextAction = nextAction;
  if (nextActionAt) body.nextActionAt = nextActionAt;

  try {
    const response = await fetch(`${API_URL}/api/internal/leads/${leadId}/touches`, {
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

    console.log(`✓ Touch logged: ${summary}`);
  } catch (error) {
    console.error('Request failed:', error);
    process.exit(1);
  }
}

logTouch();
