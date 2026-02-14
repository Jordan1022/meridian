import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const migrationClient = postgres(process.env.DATABASE_URL, { 
    max: 1,
    ssl: 'require',
  });

  try {
    await migrate(drizzle(migrationClient), {
      migrationsFolder: './drizzle/migrations',
    });
    console.log('✓ Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }

  await migrationClient.end();
}

main();
