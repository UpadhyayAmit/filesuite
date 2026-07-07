import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { ensureEngagementTables, getSql, hasDatabase } from '@/lib/server/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!process.env.CLERK_SECRET_KEY) return NextResponse.json({ ok: false, error: 'Sign-in is not configured.' }, { status: 503 });
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ ok: false, error: 'Sign in to vote.' }, { status: 401 });
  if (!hasDatabase) return NextResponse.json({ ok: false, error: 'Database is not configured.' }, { status: 503 });

  const body = (await request.json().catch(() => null)) as { slug?: string; vote?: number } | null;
  const slug = body?.slug?.trim();
  const vote = body?.vote;

  if (!slug || !/^[a-z0-9-]{2,140}$/.test(slug) || (vote !== 1 && vote !== -1)) {
    return NextResponse.json({ ok: false, error: 'Invalid vote.' }, { status: 400 });
  }

  await ensureEngagementTables();
  await getSql()`
    insert into tool_feedback (tool_slug, user_id, vote)
    values (${slug}, ${userId}, ${vote})
    on conflict (tool_slug, user_id) do update set vote = excluded.vote
  `;

  return NextResponse.json({ ok: true });
}
