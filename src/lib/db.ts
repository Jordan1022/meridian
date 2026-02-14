import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

// Validate environment
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Create postgres client with TLS
const client = postgres(process.env.DATABASE_URL, {
  prepare: false, // Required for postgres.js with Drizzle
  ssl: 'require', // Enforce TLS
  max: 10, // Connection pool size
  idle_timeout: 20,
  connect_timeout: 10,
});

// Create drizzle instance
export const db = drizzle(client, { schema });

// Export schema for type inference
export * from './schema';

// Graceful shutdown
process.on('SIGTERM', async () => {
  await client.end();
});
