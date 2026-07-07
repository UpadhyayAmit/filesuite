'use client';

import Link from 'next/link';
import { CheckCircle2, ChevronDown, MousePointerClick, Search, ShieldCheck, SmilePlus, Sparkles, Zap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ALL_TOOLS, FEATURED_TOOLS, TOOL_CATEGORIES, searchTools, type ToolDefinition } from './tool-data';

type ToolDashboardProps = {
  onSelectTool?: (toolId: string) => void;
};

const SECTION_LIMIT = 6;
type ToolStats = Record<string, { uses: number; reactions: number; comments: number; helpful: number; notHelpful: number }>;

export function ToolDashboard({ onSelectTool }: ToolDashboardProps) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [stats, setStats] = useState<ToolStats>({});
  const selectedCategory = TOOL_CATEGORIES.find((category) => category.id === activeCategory);
  const filteredTools = useMemo(() => {
    const categoryTools = activeCategory === 'all' ? ALL_TOOLS : (selectedCategory?.tools ?? []);
    return searchTools(query, categoryTools);
  }, [activeCategory, query, selectedCategory]);
  const hasQuery = query.trim().length > 0;

  function toggleSection(sectionId: string) {
    setExpandedSections((current) => ({ ...current, [sectionId]: !current[sectionId] }));
  }

  useEffect(() => {
    let cancelled = false;
    const slugs = ALL_TOOLS.map((tool) => tool.slug).join(',');

    fetch(`/api/tool-stats?slugs=${encodeURIComponent(slugs)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled && data?.stats) setStats(data.stats);
      })
      .catch(() => {
        if (!cancelled) setStats({});
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="min-h-[calc(100vh-81px)] bg-paper">
      <MarketplaceNav activeCategory={activeCategory} onCategory={setActiveCategory} />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:px-8">
        <header className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-xl border border-line bg-white px-5 py-8 text-center shadow-soft md:px-10 md:py-10">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-coral via-sage to-[#7c3aed]" />
          <div className="absolute right-4 top-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-line bg-paper text-blue-700 shadow-sm" title="Private mode on">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="mx-auto grid max-w-4xl justify-items-center gap-5">
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.02em] text-ink md:text-4xl">Private Dev Toolbox</h1>
            <p className="mx-auto mt-3 max-w-3xl text-sm leading-6 text-muted md:text-base md:leading-7">
              A marketplace-style toolbox for JSON, JWT, APIs, logs, prompts, files, audio workflows, and WASM-powered utilities.
            </p>
          </div>

          <label className="relative flex h-14 w-full max-w-4xl overflow-hidden rounded-lg border border-line bg-white text-left shadow-[0_18px_55px_rgba(20,24,36,0.10)] md:h-16">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tools: JSON formatter, JWT decoder, cron parser, PDF to EPUB, ebook podcast..."
              className="h-full min-w-0 flex-1 border-0 bg-white pl-14 pr-4 text-base text-ink outline-none placeholder:text-slate-400 md:text-lg"
            />
            <span className="hidden h-full items-center bg-coral px-6 text-white sm:flex">
              <Search className="h-6 w-6" aria-hidden="true" />
            </span>
          </label>

          <div className="grid w-full max-w-3xl gap-2 sm:grid-cols-3">
            <TrustStat icon={CheckCircle2} label={`${ALL_TOOLS.filter((tool) => tool.status === 'live').length} browser-only tools`} />
            <TrustStat icon={Zap} label="WASM and workers for heavy jobs" />
            <TrustStat icon={ShieldCheck} label="No tool-content storage" />
          </div>
          </div>
        </header>

        {hasQuery ? (
          <MarketplaceSection
            id="search"
            title={`Search results (${filteredTools.length})`}
            tools={filteredTools}
            onSelectTool={onSelectTool}
            expanded
            stats={stats}
          />
        ) : activeCategory === 'all' ? (
          <>
            <MarketplaceSection
              id="featured"
              title="Featured"
              tools={FEATURED_TOOLS}
              onSelectTool={onSelectTool}
              stats={stats}
              expanded={Boolean(expandedSections.featured)}
              onToggle={() => toggleSection('featured')}
              featured
            />
            <MarketplaceSection
              id="popular"
              title="Most Popular"
              tools={ALL_TOOLS.filter((tool) => tool.status === 'live')}
              onSelectTool={onSelectTool}
              stats={stats}
              expanded={Boolean(expandedSections.popular)}
              onToggle={() => toggleSection('popular')}
            />
            <MarketplaceSection
              id="recent"
              title="Recently Added"
              tools={ALL_TOOLS.filter((tool) => ['prompt-diff', 'pdf-epub', 'ebook-podcast', 'site-podcast', 'openapi-validator', 'curl-converter'].includes(tool.id))}
              onSelectTool={onSelectTool}
              stats={stats}
              expanded={Boolean(expandedSections.recent)}
              onToggle={() => toggleSection('recent')}
            />
            {TOOL_CATEGORIES.map((category) => (
              <MarketplaceSection
                key={category.id}
                id={category.id}
                title={category.name}
                description={category.description}
                tools={category.tools}
                onSelectTool={onSelectTool}
                stats={stats}
                expanded={Boolean(expandedSections[category.id])}
                onToggle={() => toggleSection(category.id)}
              />
            ))}
          </>
        ) : (
          <MarketplaceSection
            id={selectedCategory?.id ?? 'category'}
            title={selectedCategory?.name ?? 'Tools'}
            description={selectedCategory?.description}
            tools={selectedCategory?.tools ?? []}
            onSelectTool={onSelectTool}
            stats={stats}
            expanded={Boolean(expandedSections[selectedCategory?.id ?? activeCategory])}
            onToggle={() => toggleSection(selectedCategory?.id ?? activeCategory)}
          />
        )}
      </div>
    </section>
  );
}

function MarketplaceNav({
  activeCategory,
  onCategory,
}: {
  activeCategory: string;
  onCategory: (category: string) => void;
}) {
  const categories = [{ id: 'all', label: 'All Tools' }, ...TOOL_CATEGORIES.map((category) => ({ id: category.id, label: category.name }))];

  return (
    <div className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-6xl overflow-x-auto px-4 sm:px-6 lg:px-8" aria-label="Tool categories">
        {categories.map((category) => {
          const isActive = activeCategory === category.id;
          return (
            <button
              key={category.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => onCategory(category.id)}
              className={`min-h-14 shrink-0 border-x border-line px-5 text-sm font-semibold transition ${
                isActive ? 'bg-ink text-white' : 'bg-white text-ink hover:bg-paper'
              }`}
            >
              {category.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TrustStat({ icon: Icon, label }: { icon: typeof ShieldCheck; label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-md border border-line bg-white px-3 py-2.5 text-xs font-semibold text-ink shadow-sm">
      <Icon className="h-4 w-4 text-moss" aria-hidden="true" />
      {label}
    </div>
  );
}

function MarketplaceSection({
  id,
  title,
  description,
  tools,
  featured = false,
  expanded = false,
  onToggle,
  onSelectTool,
  stats,
}: {
  id: string;
  title: string;
  description?: string;
  tools: readonly ToolDefinition[];
  featured?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  onSelectTool?: (toolId: string) => void;
  stats: ToolStats;
}) {
  const visibleTools = expanded ? tools : tools.slice(0, SECTION_LIMIT);
  const canExpand = tools.length > SECTION_LIMIT;
  const category = TOOL_CATEGORIES.find((item) => item.name === title);
  const SectionIcon = category?.icon ?? Sparkles;

  return (
    <section className="grid gap-5" aria-labelledby={`${id}-title`}>
      <div className="flex items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white text-sage shadow-sm">
            <SectionIcon className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
          <div className="flex items-center gap-2">
            <h2 id={`${id}-title`} className="text-xl font-semibold text-ink">
              {title}
            </h2>
            {featured ? <Sparkles className="h-5 w-5 text-coral" aria-hidden="true" /> : null}
          </div>
          {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
          </div>
        </div>
        {canExpand && onToggle ? (
          <button type="button" onClick={onToggle} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700">
            {expanded ? 'Show less' : 'Show all'}
            <ChevronDown className={`h-4 w-4 transition ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {visibleTools.map((tool) => (
          <MarketplaceToolCard key={tool.id} tool={tool} stats={stats[tool.slug]} onSelectTool={onSelectTool} />
        ))}
      </div>
    </section>
  );
}

function MarketplaceToolCard({
  tool,
  stats,
  onSelectTool,
}: {
  tool: ToolDefinition;
  stats?: { uses: number; reactions: number; comments: number; helpful: number; notHelpful: number };
  onSelectTool?: (toolId: string) => void;
}) {
  const Icon = tool.icon;
  const statusLabel = tool.status === 'planned' ? 'SOON' : tool.status === 'ai-opt-in' ? 'AI' : '';
  const statusClass =
    tool.status === 'live'
      ? 'text-emerald-700'
      : tool.status === 'planned'
        ? 'text-muted'
        : 'text-coral';
  const iconStyle = getToolIconStyle(tool);

  const content = (
    <div className="market-card grid h-full min-h-[266px] grid-rows-[auto_auto_1fr_auto] gap-3 border border-line bg-white p-3.5 text-left shadow-soft transition hover:-translate-y-1 hover:border-sage hover:shadow-lg">
      <div className="flex justify-center pt-1">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-line shadow-sm" style={iconStyle}>
          <Icon className="h-9 w-9" aria-hidden="true" />
        </span>
      </div>
      <div className="min-w-0 text-center">
        <h3 className="min-h-[40px] text-balance text-sm font-semibold leading-5 text-ink">{tool.name}</h3>
        <p className="mt-1 text-xs font-medium text-muted">{tool.category}</p>
      </div>
      <p className="line-clamp-3 text-center text-xs leading-5 text-muted">{tool.description}</p>
      <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted" title="Emoji reactions">
          <SmilePlus className="h-3.5 w-3.5 text-coral" aria-hidden="true" />
          {stats?.reactions ?? 0}
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted" title="Tool uses">
          <MousePointerClick className="h-3.5 w-3.5 text-blue-700" aria-hidden="true" />
          {stats?.uses ?? 0}
        </span>
        {statusLabel ? (
          <span className={`text-xs font-bold ${statusClass}`}>{statusLabel}</span>
        ) : null}
      </div>
    </div>
  );

  if (onSelectTool) {
    return (
      <button type="button" onClick={() => onSelectTool(tool.id)} className="block h-full">
        {content}
      </button>
    );
  }

  return (
    <Link href={`/tools/${tool.slug}`} className="block h-full">
      {content}
    </Link>
  );
}

function getToolIconStyle(tool: ToolDefinition) {
  const palettes = [
    ['#365cf5', '#7c3aed'],
    ['#ff6b35', '#ffb703'],
    ['#0ea5e9', '#14b8a6'],
    ['#7c3aed', '#ec4899'],
    ['#0f766e', '#22c55e'],
    ['#1d4ed8', '#06b6d4'],
    ['#be123c', '#fb7185'],
    ['#4338ca', '#818cf8'],
    ['#c2410c', '#f97316'],
    ['#0f172a', '#475569'],
  ];
  const [from, to] = palettes[tool.priority % palettes.length];

  return {
    color: from,
    background: `linear-gradient(135deg, ${from}18, ${to}22)`,
  };
}
