import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Bot, FileCheck2, GitCommitHorizontal, KeyRound, ShieldCheck, TerminalSquare, Workflow } from 'lucide-react';
import { CopyBlock } from '@/components/AgentPanel';
import {
  AGENT_INTEGRATIONS,
  CLAUDE_INSTALL,
  PRE_COMMIT_CONFIG,
  REPO_URL,
  STANDALONE_HOOKS,
  type AgentIntegration,
} from '@/components/agent-data';
import { ALL_TOOLS } from '@/components/tool-data';

export const metadata: Metadata = {
  title: 'Agent Skills & Hooks | filesuite.dev',
  description:
    'File Suite developer tools as agent skills and hooks for Claude Code, Codex CLI, Cursor and git pre-commit. Local-only Python, no install step.',
};

const SURFACES = [
  {
    icon: Bot,
    title: 'Skills',
    text: 'A SKILL.md plus a script. The agent loads it when the task matches, then runs the script instead of guessing.',
    who: 'The agent decides when',
  },
  {
    icon: Workflow,
    title: 'Claude Code hooks',
    text: 'Run on every file write or edit. They can block the action or send an error back for the agent to fix.',
    who: 'Runs every time',
  },
  {
    icon: GitCommitHorizontal,
    title: 'pre-commit hooks',
    text: 'The same scripts run on git commit, so the checks apply to people, every agent and CI.',
    who: 'Runs on every commit',
  },
  {
    icon: TerminalSquare,
    title: 'Plain CLI',
    text: 'Every script is a Python 3.9+ CLI with only the standard library. Copy it and run it; nothing to install.',
    who: 'You run it',
  },
];

const DEMO = [
  {
    icon: KeyRound,
    title: 'Agent tries to write an API key',
    before: `Write config.py\nAWS_KEY = 'AKIA…'`,
    after: `PreToolUse:Write blocked\nfilesuite guard_secrets: aws-access-key-id at line 1 (AKIAQW...(20 chars)).\nLoad it from an environment variable instead.`,
    result: 'The file is never created.',
  },
  {
    icon: FileCheck2,
    title: 'Agent leaves a trailing comma in JSON',
    before: `Write settings.json\n{"a": 1,}`,
    after: `filesuite validate_structured: settings.json is no longer valid\n(line 1 col 8: Illegal trailing comma). Fix the syntax now.`,
    result: 'The agent fixes it in the same turn: {"a": 1}',
  },
];

function IntegrationCard({ integration, toolSlug, toolName }: { integration: AgentIntegration; toolSlug?: string; toolName?: string }) {
  return (
    <article className="grid content-start gap-3 rounded-2xl border border-line bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-[#f1ecff] px-2.5 py-1 text-xs font-semibold text-[#6d28d9]">
          {integration.kind === 'skill' ? 'Skill' : 'Hook'}
        </span>
        <code className="text-xs text-muted">{integration.name}</code>
      </div>
      <h3 className="text-base font-semibold text-ink">{integration.title}</h3>
      <p className="text-sm leading-6 text-muted">{integration.summary}</p>
      <ul className="grid gap-1 text-xs leading-5 text-ink">
        {integration.benefits.map((benefit) => (
          <li key={benefit}>• {benefit}</li>
        ))}
      </ul>
      <CopyBlock code={integration.terminal} label={`${integration.name} terminal command`} />
      {toolSlug ? (
        <Link href={`/tools/${toolSlug}`} className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:underline">
          Try {toolName} in the browser <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      ) : null}
    </article>
  );
}

export default function AgentsPage() {
  const toolIntegrations = Object.entries(AGENT_INTEGRATIONS).map(([toolId, integration]) => {
    const tool = ALL_TOOLS.find((item) => item.id === toolId);
    return { integration, toolSlug: tool?.slug, toolName: tool?.name };
  });

  return (
    <main className="bg-paper">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-6 lg:px-8">
        <header className="grid gap-5">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-coral">Agent Skills & Hooks</p>
          <h1 className="max-w-3xl text-3xl font-medium tracking-[-0.02em] text-ink md:text-4xl">
            File Suite tools, inside your coding agent.
          </h1>
          <p className="max-w-3xl text-lg leading-8 text-muted">
            The same local-first tools you use in the browser, packaged for Claude Code, Codex CLI, Cursor, Gemini CLI and git.
            Everything runs on your machine with plain Python: no uploads, no API keys, no install step.
          </p>
          <div className="grid max-w-2xl gap-2">
            <p className="text-sm font-semibold text-ink">Install in Claude Code</p>
            <CopyBlock code={CLAUDE_INSTALL} label="Claude Code install" />
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold text-ink">
            {['Python stdlib only', 'No network calls', 'Secrets redacted in output', 'Open source on GitHub'].map((item) => (
              <span key={item} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-sage" aria-hidden="true" />
                {item}
              </span>
            ))}
          </div>
        </header>

        <section className="grid gap-5" aria-labelledby="demo-title">
          <h2 id="demo-title" className="text-2xl font-semibold text-ink">What it looks like</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {DEMO.map(({ icon: Icon, title, before, after, result }) => (
              <article key={title} className="grid content-start gap-3 rounded-2xl border border-line bg-white p-5 shadow-soft">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-coral" aria-hidden="true" />
                  <h3 className="font-semibold text-ink">{title}</h3>
                </div>
                <pre className="overflow-x-auto rounded-lg bg-paper p-3 font-mono text-xs leading-5 text-ink">{before}</pre>
                <pre className="overflow-x-auto rounded-lg bg-[#0f1424] p-3 font-mono text-xs leading-5 text-amber-200">{after}</pre>
                <p className="text-sm font-semibold text-emerald-700">{result}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-5" aria-labelledby="surfaces-title">
          <h2 id="surfaces-title" className="text-2xl font-semibold text-ink">Four ways to use one script</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SURFACES.map(({ icon: Icon, title, text, who }) => (
              <div key={title} className="grid content-start gap-2 rounded-2xl border border-line bg-white p-5 shadow-soft">
                <Icon className="h-6 w-6 text-sage" aria-hidden="true" />
                <h3 className="font-semibold text-ink">{title}</h3>
                <p className="text-sm leading-6 text-muted">{text}</p>
                <p className="text-xs font-semibold text-coral">{who}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-5" aria-labelledby="catalog-title">
          <h2 id="catalog-title" className="text-2xl font-semibold text-ink">Available now</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {toolIntegrations.map(({ integration, toolSlug, toolName }) => (
              <IntegrationCard key={integration.name} integration={integration} toolSlug={toolSlug} toolName={toolName} />
            ))}
            {STANDALONE_HOOKS.map((integration) => (
              <IntegrationCard key={integration.name} integration={integration} />
            ))}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2" aria-labelledby="other-title">
          <div className="grid content-start gap-3">
            <h2 id="other-title" className="text-xl font-semibold text-ink">Other agents</h2>
            <p className="text-sm leading-6 text-muted">
              Codex CLI, Cursor, Gemini CLI, Copilot and other agents that read <code>SKILL.md</code> folders can use the skills directly.
              Copy a folder from <code>plugins/filesuite-devtools/skills/</code> into that agent&rsquo;s skills directory.
            </p>
          </div>
          <div className="grid content-start gap-3">
            <h2 className="text-xl font-semibold text-ink">Any repo, via pre-commit</h2>
            <CopyBlock code={PRE_COMMIT_CONFIG} label="pre-commit config" />
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-white p-6 shadow-soft">
          <h2 className="text-xl font-semibold text-ink">Read before you install</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            You should read any third-party skill or hook before installing it. These are short, stdlib-only Python scripts with tests,
            so that takes minutes. Secret detection uses patterns: it is a fast first check, not a replacement for a full secret scanner.
            Token counts are estimates (about ±20%).
          </p>
          <a href={REPO_URL} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:underline">
            View the source on GitHub <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </section>
      </div>
    </main>
  );
}
