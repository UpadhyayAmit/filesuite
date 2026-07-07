import { neon } from '@neondatabase/serverless';

let initialized = false;

export const hasDatabase = Boolean(process.env.DATABASE_URL);

export function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured.');
  }

  return neon(process.env.DATABASE_URL);
}

export async function ensureEngagementTables() {
  if (initialized || !hasDatabase) return;

  const sql = getSql();

  await sql`
    create table if not exists tool_usage (
      id serial primary key,
      tool_slug varchar(140) not null,
      tool_id varchar(140) not null,
      action varchar(80),
      user_id varchar(255),
      created_at timestamptz not null default now()
    )
  `;

  await sql`
    create table if not exists tool_reactions (
      id serial primary key,
      tool_slug varchar(140) not null,
      user_id varchar(255) not null,
      emoji varchar(16) not null,
      created_at timestamptz not null default now(),
      unique (tool_slug, user_id, emoji)
    )
  `;

  await sql`
    create table if not exists tool_feedback (
      id serial primary key,
      tool_slug varchar(140) not null,
      user_id varchar(255) not null,
      vote integer not null,
      created_at timestamptz not null default now(),
      unique (tool_slug, user_id)
    )
  `;

  await sql`
    create table if not exists tool_comments (
      id serial primary key,
      tool_slug varchar(140) not null,
      user_id varchar(255) not null,
      user_name varchar(255) not null,
      user_avatar text,
      body text not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;

  await sql`create index if not exists idx_tool_usage_slug on tool_usage (tool_slug)`;
  await sql`create index if not exists idx_tool_reactions_slug on tool_reactions (tool_slug)`;
  await sql`create index if not exists idx_tool_feedback_slug on tool_feedback (tool_slug)`;
  await sql`create index if not exists idx_tool_comments_slug_created on tool_comments (tool_slug, created_at desc)`;

  initialized = true;
}
