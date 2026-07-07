import { auth, currentUser } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { ensureEngagementTables, getSql, hasDatabase } from '@/lib/server/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')?.trim();
  if (!slug || !/^[a-z0-9-]{2,140}$/.test(slug)) {
    return NextResponse.json({ comments: [] }, { status: 400 });
  }

  if (!hasDatabase) return NextResponse.json({ comments: [] });
  await ensureEngagementTables();

  const comments = (await getSql()`
    select id, tool_slug, user_id, user_name, user_avatar, body, created_at
    from tool_comments
    where tool_slug = ${slug}
    order by created_at desc
    limit 50
  `) as ToolComment[];

  return NextResponse.json({ comments });
}

export async function POST(request: NextRequest) {
  if (!process.env.CLERK_SECRET_KEY) return NextResponse.json({ ok: false, error: 'Sign-in is not configured.' }, { status: 503 });
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ ok: false, error: 'Sign in to comment.' }, { status: 401 });
  if (!hasDatabase) return NextResponse.json({ ok: false, error: 'Database is not configured.' }, { status: 503 });

  const body = (await request.json().catch(() => null)) as { slug?: string; body?: string } | null;
  const slug = body?.slug?.trim();
  const text = body?.body?.trim();

  if (!slug || !/^[a-z0-9-]{2,140}$/.test(slug) || !text || text.length < 2) {
    return NextResponse.json({ ok: false, error: 'Comment is too short.' }, { status: 400 });
  }

  const user = await currentUser();
  const userName = user?.fullName ?? user?.username ?? user?.primaryEmailAddress?.emailAddress ?? 'File Suite user';
  const userAvatar = user?.imageUrl ?? null;

  await ensureEngagementTables();
  const [comment] = (await getSql()`
    insert into tool_comments (tool_slug, user_id, user_name, user_avatar, body)
    values (${slug}, ${userId}, ${userName}, ${userAvatar}, ${text.slice(0, 2000)})
    returning id, tool_slug, user_id, user_name, user_avatar, body, created_at
  `) as ToolComment[];

  return NextResponse.json({ ok: true, comment });
}

export async function DELETE(request: NextRequest) {
  if (!process.env.CLERK_SECRET_KEY) return NextResponse.json({ ok: false, error: 'Sign-in is not configured.' }, { status: 503 });
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  if (!hasDatabase) return NextResponse.json({ ok: false, error: 'Database is not configured.' }, { status: 503 });

  const id = Number.parseInt(request.nextUrl.searchParams.get('id') ?? '', 10);
  if (!Number.isInteger(id)) return NextResponse.json({ ok: false, error: 'Invalid comment.' }, { status: 400 });

  await ensureEngagementTables();
  const [row] = (await getSql()`
    select user_id from tool_comments where id = ${id}
  `) as Pick<ToolComment, 'user_id'>[];
  if (!row) return NextResponse.json({ ok: false, error: 'Not found.' }, { status: 404 });
  if (row.user_id !== userId) return NextResponse.json({ ok: false, error: 'Forbidden.' }, { status: 403 });

  await getSql()`delete from tool_comments where id = ${id}`;
  return NextResponse.json({ ok: true });
}

type ToolComment = {
  id: number;
  tool_slug: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  body: string;
  created_at: string;
};
