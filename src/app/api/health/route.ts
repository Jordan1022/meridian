import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    env: {
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
      hasOpenclawToken: !!process.env.OPENCLAW_TOKEN,
      hasBootstrapEmail: !!process.env.BOOTSTRAP_EMAIL,
      hasBootstrapPassword: !!process.env.BOOTSTRAP_PASSWORD,
      nodeEnv: process.env.NODE_ENV,
    }
  });
}
