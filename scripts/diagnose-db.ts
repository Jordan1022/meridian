#!/usr/bin/env tsx
import 'dotenv/config';
import postgres from 'postgres';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const client = postgres(databaseUrl, {
    max: 1,
    ssl: 'require',
    connect_timeout: 10,
  });

  try {
    const [nowRow] = await client`select now() as now`;
    const [{ count: leadCount }] = await client`select count(*)::int as count from leads`;
    const [{ count: touchCount }] = await client`select count(*)::int as count from touches`;
    const [{ count: userCount }] = await client`select count(*)::int as count from users`;

    console.log('Database connectivity: OK');
    console.log(`Server time: ${nowRow.now}`);
    console.log(`Leads: ${leadCount}`);
    console.log(`Touches: ${touchCount}`);
    console.log(`Users: ${userCount}`);
  } catch (error) {
    console.error('Database connectivity: FAILED');
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
