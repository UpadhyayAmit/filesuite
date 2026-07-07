import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { ensureEngagementTables, getSql, hasDatabase } from '@/lib/server/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const EMOJIS = new Set(['👍', '❤️', '🔥', '🤯', '🚀']);

export async function POST(request: NextRequest) {
  if (!process.env.CLERK_SECRET_KEY) return NextResponse.json({ ok: false, error: 'Sign-in is not configured.' }, { status: 503 });
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ ok: false, error: 'Sign in to react.' }, { status: 401 });
  if (!hasDatabase) return NextResponse.json({ ok: false, error: 'Database is not configured.' }, { status: 503 });

  const body = (await request.json().catch(() => null)) as { slug?: string; emoji?: string } | null;
  const slug = body?.slug?.trim();
  const emoji = body?.emoji?.trim();

  if (!slug || !/^[a-z0-9-]{2,140}$/.test(slug) || !emoji || !EMOJIS.has(emoji)) {
    return NextResponse.json({ ok: false, error: 'Invalid reaction.' }, { status: 400 });
  }

  await ensureEngagementTables();
  await getSql()`
    insert into tool_reactions (tool_slug, user_id, emoji)
    values (${slug}, ${userId}, ${emoji})
    on conflict (tool_slug, user_id, emoji) do nothing
  `;

  return NextResponse.json({ ok: true });
}
