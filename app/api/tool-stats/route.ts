import { NextRequest, NextResponse } from 'next/server';
import { ensureEngagementTables, getSql, hasDatabase } from '@/lib/server/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=45, stale-while-revalidate=180',
};

export async function GET(request: NextRequest) {
  const slugs = parseSlugs(request);
  if (slugs.length === 0) return NextResponse.json({ stats: {} }, { headers: CACHE_HEADERS });
  if (!hasDatabase) return NextResponse.json({ stats: emptyStats(slugs) }, { headers: CACHE_HEADERS });

  await ensureEngagementTables();
  const sql = getSql();

  const [usageRows, reactionRows, commentRows, feedbackRows] = await Promise.all([
    sql`
      select tool_slug, cast(count(*) as int) as count
      from tool_usage
      where tool_slug = any(${slugs})
      group by tool_slug
    `,
    sql`
      select tool_slug, cast(count(*) as int) as count
      from tool_reactions
      where tool_slug = any(${slugs})
      group by tool_slug
    `,
    sql`
      select tool_slug, cast(count(*) as int) as count
      from tool_comments
      where tool_slug = any(${slugs})
      group by tool_slug
    `,
    sql`
      select
        tool_slug,
        cast(sum(case when vote = 1 then 1 else 0 end) as int) as helpful,
        cast(sum(case when vote = -1 then 1 else 0 end) as int) as not_helpful
      from tool_feedback
      where tool_slug = any(${slugs})
      group by tool_slug
    `,
  ]);

  const stats = emptyStats(slugs);
  for (const row of usageRows as CountRow[]) stats[row.tool_slug].uses = row.count;
  for (const row of reactionRows as CountRow[]) stats[row.tool_slug].reactions = row.count;
  for (const row of commentRows as CountRow[]) stats[row.tool_slug].comments = row.count;
  for (const row of feedbackRows as FeedbackRow[]) {
    stats[row.tool_slug].helpful = row.helpful ?? 0;
    stats[row.tool_slug].notHelpful = row.not_helpful ?? 0;
  }

  return NextResponse.json({ stats }, { headers: CACHE_HEADERS });
}

type CountRow = { tool_slug: string; count: number };
type FeedbackRow = { tool_slug: string; helpful: number | null; not_helpful: number | null };

function parseSlugs(request: NextRequest) {
  const value = request.nextUrl.searchParams.get('slugs') ?? request.nextUrl.searchParams.get('slug') ?? '';
  return Array.from(
    new Set(
      value
        .split(',')
        .map((slug) => slug.trim())
        .filter((slug) => /^[a-z0-9-]{2,140}$/.test(slug)),
    ),
  ).slice(0, 100);
}

function emptyStats(slugs: readonly string[]) {
  return Object.fromEntries(
    slugs.map((slug) => [
      slug,
      {
        uses: 0,
        reactions: 0,
        comments: 0,
        helpful: 0,
        notHelpful: 0,
      },
    ]),
  );
}
