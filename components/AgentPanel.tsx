'use client';

import Link from 'next/link';
import { Bot, Check, Copy, FolderInput, GitCommitHorizontal, TerminalSquare } from 'lucide-react';
import { useState } from 'react';
import { CLAUDE_INSTALL, copyCommand, type AgentIntegration } from './agent-data';

type TabId = 'claude' | 'copy' | 'terminal';

export function CopyBlock({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-line bg-[#0f1424]">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-1.5">
        <span className="text-[11px] font-medium text-slate-400">{label}</span>
        <button
          type="button"
          onClick={copy}
          aria-label={`Copy ${label}`}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-white/20"
        >
          {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-left font-mono text-xs leading-6 text-slate-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function AgentPanel({ integration }: { integration: AgentIntegration }) {
  const isSkill = integration.kind === 'skill';
  const tabs: { id: TabId; label: string; icon: typeof Bot; hint: string; code: string }[] = [
    {
      id: 'claude',
      label: 'Claude Code',
      icon: Bot,
      hint: 'Installs every File Suite skill and hook in one step.',
      code: CLAUDE_INSTALL,
    },
    {
      id: 'copy',
      label: isSkill ? 'Any agent' : 'pre-commit',
      icon: isSkill ? FolderInput : GitCommitHorizontal,
      hint: isSkill
        ? 'Works with agents that read SKILL.md folders (Codex CLI, Cursor, Gemini CLI, Copilot). Use that agent’s skills directory.'
        : 'Runs the same check on every git commit, whoever wrote the code.',
      code: copyCommand(integration),
    },
    {
      id: 'terminal',
      label: 'Terminal',
      icon: TerminalSquare,
      hint: 'Plain Python 3.9+ with only the standard library. Runs fully on your machine.',
      code: integration.terminal,
    },
  ];
  const [active, setActive] = useState<TabId>('claude');
  const tab = tabs.find((item) => item.id === active) ?? tabs[0];

  return (
    <section
      aria-labelledby="agent-panel-title"
      className="grid gap-4 rounded-2xl border border-line bg-white p-5 shadow-soft"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-[#f1ecff] px-2.5 py-1 text-xs font-semibold text-[#6d28d9]">
            <Bot className="h-3.5 w-3.5" aria-hidden="true" />
            Use in your agent · {isSkill ? 'Skill' : 'Hook'}
          </p>
          <h2 id="agent-panel-title" className="mt-2 text-lg font-semibold text-ink">
            {integration.title}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">{integration.summary}</p>
        </div>
        <Link href="/agents" className="text-sm font-semibold text-blue-700 hover:underline">
          How it works
        </Link>
      </div>

      <ul className="grid gap-1.5 text-sm text-ink sm:grid-cols-3 sm:gap-3">
        {integration.benefits.map((benefit) => (
          <li key={benefit} className="flex gap-2 rounded-lg bg-paper px-3 py-2 text-xs leading-5">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
            {benefit}
          </li>
        ))}
      </ul>

      <div className="grid gap-3">
        <div role="tablist" aria-label="Install options" className="flex flex-wrap gap-2">
          {tabs.map((item) => {
            const Icon = item.icon;
            const selected = item.id === active;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActive(item.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  selected ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink hover:border-sage'
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {item.label}
              </button>
            );
          })}
        </div>
        <div role="tabpanel" className="grid gap-2">
          <p className="text-xs leading-5 text-muted">{tab.hint}</p>
          <CopyBlock code={tab.code} label={`${tab.label} command`} />
        </div>
      </div>
    </section>
  );
}
