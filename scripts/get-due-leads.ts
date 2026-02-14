#!/usr/bin/env tsx
/**
 * Get due leads via CLI
 * Usage: OPENCLAW_TOKEN=xxx npx tsx scripts/get-due-leads.ts --days 7
 */

import 'dotenv/config';
import { format, parseISO } from 'date-fns';

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

async function getDueLeads() {
  const days = args.days || '7';

  try {
    const response = await fetch(`${API_URL}/api/internal/due?days=${days}`, {
      method: 'GET',
      headers: {
        'X-OPENCLAW-TOKEN': AUTH_TOKEN,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Error:', data.error || 'Request failed');
      process.exit(1);
    }

    if (data.leads.length === 0) {
      console.log('No leads due in the next', days, 'days.');
      return;
    }

    console.log(`\nDue in next ${days} days:\n`);
    console.log('─'.repeat(80));

    for (const lead of data.leads) {
      const date = lead.nextActionAt ? format(parseISO(lead.nextActionAt), 'MMM d, yyyy') : 'No date';
      const value = lead.value ? `$${lead.value.toLocaleString()}` : 'N/A';
      
      console.log(`${date} | ${lead.name} | ${lead.stage} | ${value}`);
      if (lead.nextAction) {
        console.log(`         → ${lead.nextAction}`);
      }
      console.log('─'.repeat(80));
    }

    console.log(`\nTotal: ${data.leads.length} leads`);
  } catch (error) {
    console.error('Request failed:', error);
    process.exit(1);
  }
}

getDueLeads();
