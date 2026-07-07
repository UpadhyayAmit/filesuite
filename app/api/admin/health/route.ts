import { NextRequest, NextResponse } from 'next/server';
import { ensureEngagementTables, getSql, hasDatabase } from '@/lib/server/db';
import { hasZohoMailConfig, verifyZohoMail } from '@/lib/server/mail';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }

  const result = {
    ok: true,
    clerk: {
      publicKey: Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY),
      secretKey: Boolean(process.env.CLERK_SECRET_KEY),
    },
    neon: {
      configured: hasDatabase,
      connected: false,
      tablesReady: false,
    },
    zoho: {
      configured: hasZohoMailConfig,
      verified: false,
    },
  };

  if (hasDatabase) {
    try {
      await ensureEngagementTables();
      await getSql()`select 1`;
      result.neon.connected = true;
      result.neon.tablesReady = true;
    } catch {
      result.ok = false;
    }
  }

  if (hasZohoMailConfig && request.nextUrl.searchParams.get('verifyMail') === 'true') {
    try {
      result.zoho.verified = await verifyZohoMail();
    } catch {
      result.ok = false;
    }
  }

  return NextResponse.json(result);
}

function isAuthorized(request: NextRequest) {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) return false;

  const header = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const query = request.nextUrl.searchParams.get('token');
  return header === adminToken || query === adminToken;
}
