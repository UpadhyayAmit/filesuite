import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { ensureEngagementTables, getSql, hasDatabase } from '@/lib/server/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!hasDatabase) return NextResponse.json({ ok: true, stored: false });

  const body = (await request.json().catch(() => null)) as { slug?: string; toolId?: string; action?: string } | null;
  const slug = body?.slug?.trim();
  const toolId = body?.toolId?.trim();
  const action = body?.action?.trim().slice(0, 80) || null;

  if (!slug || !toolId || !/^[a-z0-9-]{2,140}$/.test(slug)) {
    return NextResponse.json({ ok: false, error: 'Invalid tool.' }, { status: 400 });
  }

  const userId = process.env.CLERK_SECRET_KEY ? (await auth()).userId : null;
  await ensureEngagementTables();
  await getSql()`
    insert into tool_usage (tool_slug, tool_id, action, user_id)
    values (${slug}, ${toolId}, ${action}, ${userId ?? null})
  `;

  return NextResponse.json({ ok: true, stored: true });
}
