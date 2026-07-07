'use client';

import { SignInButton, useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { Link2, MessageCircle, Send, SmilePlus, Sparkles, ThumbsDown, ThumbsUp, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ALL_TOOLS, findCategoryForTool, type ToolDefinition } from './tool-data';
import { clerkAppearance } from '@/lib/clerkAppearance';
import { CLERK_CONFIGURED } from '@/lib/clerkConfig';

type ToolStats = {
  uses: number;
  reactions: number;
  comments: number;
  helpful: number;
  notHelpful: number;
};

type ToolComment = {
  id: number;
  tool_slug: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  body: string;
  created_at: string;
};

const EMOJIS = ['👍', '❤️', '🔥', '🤯', '🚀'];
const EMPTY_STATS: ToolStats = { uses: 0, reactions: 0, comments: 0, helpful: 0, notHelpful: 0 };

export function ToolRightRail({ tool }: { tool: ToolDefinition }) {
  const category = findCategoryForTool(tool.id);
  const related = ALL_TOOLS.filter((item) => item.category === tool.category && item.id !== tool.id).slice(0, 6);

  return (
    <aside className="sticky top-24 hidden h-fit grid-cols-1 gap-4 xl:grid">
      <ToolHelpfulCard tool={tool} />
      <div className="rounded-2xl border border-line bg-white p-4 shadow-[0_18px_55px_rgba(22,34,51,0.08)]">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eafaf3] text-emerald-700">
            <Link2 className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">Related tools</p>
            <p className="text-xs text-muted">{category?.name ?? tool.category}</p>
          </div>
        </div>
        <div className="mt-3 grid gap-2">
          {related.map((item) => (
            <Link key={item.id} href={`/tools/${item.slug}`} className="rounded-xl border border-line bg-gradient-to-br from-white to-[#f7f9ff] px-3 py-2 text-sm text-muted transition hover:-translate-y-0.5 hover:border-blue-300 hover:text-ink hover:shadow-md">
              <span className="flex items-start gap-2">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-blue-700 ring-1 ring-line">
                  <item.icon className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-medium text-ink">{item.name}</span>
                  {item.status !== 'live' ? (
                    <span className="text-xs text-muted">{item.status === 'planned' ? 'Planned' : 'AI opt-in'}</span>
                  ) : null}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}

export function ToolInfoSections({ tool }: { tool: ToolDefinition }) {
  return (
    <div className="grid gap-6">
      <ToolComments tool={tool} />
    </div>
  );
}

function ToolHelpfulCard({ tool }: { tool: ToolDefinition }) {
  if (!CLERK_CONFIGURED) return <ToolHelpfulReadOnly tool={tool} />;
  return <ToolHelpfulSignedIn tool={tool} />;
}

function ToolHelpfulReadOnly({ tool }: { tool: ToolDefinition }) {
  const stats = useToolStats(tool.slug);
  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-[0_18px_55px_rgba(22,34,51,0.08)]">
      <HelpfulHeader />
      <div className="mt-3 flex gap-2">
        <FeedbackCount icon="up" count={stats.helpful} />
        <FeedbackCount icon="down" count={stats.notHelpful} />
      </div>
      <p className="mt-2 text-xs text-muted">Enable sign-in to save votes.</p>
    </div>
  );
}

function ToolHelpfulSignedIn({ tool }: { tool: ToolDefinition }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [stats, setStats] = useState<ToolStats>(EMPTY_STATS);

  useEffect(() => {
    let cancelled = false;
    fetchToolStats(tool.slug).then((next) => {
      if (!cancelled) setStats(next);
    });
    return () => {
      cancelled = true;
    };
  }, [tool.slug]);

  async function vote(value: 1 | -1) {
    const response = await fetch('/api/tool-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: tool.slug, vote: value }),
    });
    if (response.ok) setStats(await fetchToolStats(tool.slug));
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-[0_18px_55px_rgba(22,34,51,0.08)]">
      <HelpfulHeader />
      <div className="mt-3 flex gap-2">
        <FeedbackButton icon="up" count={stats.helpful} onClick={() => vote(1)} disabled={!isLoaded || !isSignedIn} />
        <FeedbackButton icon="down" count={stats.notHelpful} onClick={() => vote(-1)} disabled={!isLoaded || !isSignedIn} />
      </div>
      {!isSignedIn ? (
        <SignInButton mode="modal" appearance={clerkAppearance}>
          <button className="mt-3 text-xs font-semibold text-blue-700">Sign in to save your vote</button>
        </SignInButton>
      ) : null}
    </div>
  );
}

function HelpfulHeader() {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eef4ff] text-blue-700">
        <Sparkles className="h-4 w-4" aria-hidden="true" />
      </span>
      <p className="text-sm font-semibold text-ink">Helpful?</p>
    </div>
  );
}

function FeedbackCount({ icon, count }: { icon: 'up' | 'down'; count: number }) {
  const Icon = icon === 'up' ? ThumbsUp : ThumbsDown;
  return (
    <span className="inline-flex items-center gap-2 rounded-lg border border-line bg-paper px-3 py-2 text-sm text-muted">
      <Icon className="h-4 w-4" aria-hidden="true" />
      {count}
    </span>
  );
}

function FeedbackButton({ icon, count, disabled, onClick }: { icon: 'up' | 'down'; count: number; disabled: boolean; onClick: () => void }) {
  const Icon = icon === 'up' ? ThumbsUp : ThumbsDown;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-lg border border-line bg-paper px-3 py-2 text-sm text-muted transition hover:border-blue-300 hover:bg-[#eef4ff] hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {count}
    </button>
  );
}

function ToolComments({ tool }: { tool: ToolDefinition }) {
  if (!CLERK_CONFIGURED) return <ToolCommentsReadOnly tool={tool} />;
  return <ToolCommentsSignedIn tool={tool} />;
}

function ToolCommentsReadOnly({ tool }: { tool: ToolDefinition }) {
  const { comments } = useToolComments(tool.slug);
  const stats = useToolStats(tool.slug);

  return (
    <CommentsShell tool={tool} stats={stats} comments={comments}>
      <p className="rounded-xl border border-line bg-paper px-4 py-3 text-sm text-muted">Enable sign-in and Neon to collect emoji reactions and comments.</p>
    </CommentsShell>
  );
}

function ToolCommentsSignedIn({ tool }: { tool: ToolDefinition }) {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { comments, setComments, refreshComments } = useToolComments(tool.slug);
  const [stats, setStats] = useState<ToolStats>(EMPTY_STATS);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchToolStats(tool.slug).then(setStats);
  }, [tool.slug]);

  async function refreshStats() {
    setStats(await fetchToolStats(tool.slug));
  }

  async function react(emoji: string) {
    const response = await fetch('/api/tool-reactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: tool.slug, emoji }),
    });
    if (response.ok) refreshStats();
  }

  async function postComment() {
    if (!body.trim()) return;
    setBusy(true);
    try {
      const response = await fetch('/api/tool-comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: tool.slug, body }),
      });
      const data = await response.json();
      if (response.ok && data.comment) {
        setComments((current) => [data.comment, ...current]);
        setBody('');
        refreshStats();
      }
    } finally {
      setBusy(false);
    }
  }

  async function deleteComment(id: number) {
    const response = await fetch(`/api/tool-comments?id=${id}`, { method: 'DELETE' });
    if (response.ok) {
      setComments((current) => current.filter((comment) => comment.id !== id));
      refreshStats();
    }
  }

  return (
    <CommentsShell tool={tool} stats={stats} comments={comments} userId={userId} onDelete={deleteComment}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-ink">React</span>
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            disabled={!isLoaded || !isSignedIn}
            onClick={() => react(emoji)}
            className="rounded-lg border border-line bg-paper px-3 py-2 text-lg transition hover:border-blue-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {emoji}
          </button>
        ))}
      </div>

      {isSignedIn ? (
        <div className="grid gap-3">
          <textarea
            rows={4}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={2000}
            placeholder={`Share feedback for ${tool.name}`}
            className="w-full rounded-xl border border-line bg-paper p-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />
          <button
            type="button"
            disabled={busy || !body.trim()}
            onClick={postComment}
            className="inline-flex w-fit items-center gap-2 rounded-md bg-moss px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            {busy ? 'Posting...' : 'Post comment'}
          </button>
        </div>
      ) : (
        <SignInButton mode="modal" appearance={clerkAppearance}>
          <button className="w-fit rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-coral">
            Sign in to react or comment
          </button>
        </SignInButton>
      )}
    </CommentsShell>
  );
}

function CommentsShell({
  tool,
  stats,
  comments,
  userId,
  onDelete,
  children,
}: {
  tool: ToolDefinition;
  stats: ToolStats;
  comments: ToolComment[];
  userId?: string | null;
  onDelete?: (id: number) => void;
  children: React.ReactNode;
}) {
  return (
    <section id="comments" className="rounded-2xl border border-line bg-white p-5 shadow-[0_18px_55px_rgba(22,34,51,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff3e8] text-coral">
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-xl font-semibold text-ink">Feedback and comments</h2>
            <p className="text-sm text-muted">{tool.name}</p>
          </div>
        </div>
        <div className="flex gap-2 text-xs font-semibold text-muted">
          <span className="inline-flex items-center gap-1 rounded-full bg-paper px-3 py-1">
            <SmilePlus className="h-3.5 w-3.5 text-coral" aria-hidden="true" />
            {stats.reactions}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-paper px-3 py-1">
            <MessageCircle className="h-3.5 w-3.5 text-blue-700" aria-hidden="true" />
            {comments.length}
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-4">{children}</div>

      <div className="mt-5 grid gap-4">
        {comments.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-paper px-4 py-4 text-sm text-muted">No comments yet.</p>
        ) : (
          comments.map((comment) => (
            <article key={comment.id} className="rounded-xl border border-line bg-paper p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white text-sm font-semibold text-blue-700 ring-1 ring-line">
                    {comment.user_avatar ? <img src={comment.user_avatar} alt="" className="h-full w-full object-cover" /> : comment.user_name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink">{comment.user_name}</p>
                    <p className="text-xs text-muted">{new Date(comment.created_at).toLocaleString()}</p>
                  </div>
                </div>
                {userId && userId === comment.user_id && onDelete ? (
                  <button type="button" onClick={() => onDelete(comment.id)} className="rounded-md p-2 text-muted transition hover:bg-white hover:text-coral" title="Delete comment">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : null}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink">{comment.body}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function useToolStats(slug: string) {
  const [stats, setStats] = useState<ToolStats>(EMPTY_STATS);

  useEffect(() => {
    let cancelled = false;
    fetchToolStats(slug).then((next) => {
      if (!cancelled) setStats(next);
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return stats;
}

function useToolComments(slug: string) {
  const [comments, setComments] = useState<ToolComment[]>([]);

  async function refreshComments() {
    const response = await fetch(`/api/tool-comments?slug=${encodeURIComponent(slug)}`);
    if (!response.ok) return;
    const data = (await response.json()) as { comments?: ToolComment[] };
    setComments(data.comments ?? []);
  }

  useEffect(() => {
    refreshComments();
  }, [slug]);

  return { comments, setComments, refreshComments };
}

async function fetchToolStats(slug: string): Promise<ToolStats> {
  try {
    const response = await fetch(`/api/tool-stats?slug=${encodeURIComponent(slug)}`);
    if (!response.ok) return EMPTY_STATS;
    const data = (await response.json()) as { stats?: Record<string, ToolStats> };
    return data.stats?.[slug] ?? EMPTY_STATS;
  } catch {
    return EMPTY_STATS;
  }
}
