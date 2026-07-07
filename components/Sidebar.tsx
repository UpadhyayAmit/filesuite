'use client';

import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ToolCategory } from './tool-data';

type SidebarProps = {
  categories: readonly ToolCategory[];
  activeToolId: string;
  onSelectTool: (toolId: string) => void;
  onDashboard: () => void;
};

export function Sidebar({ categories, activeToolId, onSelectTool, onDashboard }: SidebarProps) {
  const [query, setQuery] = useState('');
  const filteredCategories = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return categories;

    return categories
      .map((category) => ({
        ...category,
        tools: category.tools.filter((tool) =>
          [tool.name, tool.description, tool.slug, ...tool.keywords].some((value) => value.toLowerCase().includes(normalized)),
        ),
      }))
      .filter((category) => category.tools.length > 0);
  }, [categories, query]);

  return (
    <aside className="border-r border-line bg-paper lg:h-[calc(100vh-65px)] lg:overflow-y-auto">
      <div className="sticky top-0 z-10 grid gap-3 border-b border-line bg-paper px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Utilities</p>
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tools"
            className="h-10 w-full rounded-md border border-line bg-white pl-9 pr-3 text-sm text-ink outline-none"
          />
        </label>
        <button
          type="button"
          onClick={onDashboard}
          className={`rounded-md px-3 py-2 text-left text-sm font-semibold transition ${
            activeToolId === '' ? 'bg-moss text-white shadow-soft' : 'bg-white text-ink hover:text-moss'
          }`}
        >
          All tools dashboard
        </button>
      </div>
      <nav className="grid gap-5 p-4" aria-label="Utility categories">
        {filteredCategories.map((category) => (
          <div key={category.id}>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-moss">
              <category.icon className="h-4 w-4" aria-hidden="true" />
              {category.name}
            </div>
            <div className="grid gap-1">
              {category.tools.map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => onSelectTool(tool.id)}
                  className={`rounded-md px-3 py-2 text-left text-sm transition ${
                    activeToolId === tool.id
                      ? 'bg-moss text-white shadow-soft'
                      : 'text-ink hover:bg-white hover:text-moss'
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span>{tool.name}</span>
                    {tool.status !== 'live' ? (
                      <span className="rounded border border-current px-1.5 py-0.5 text-[10px] uppercase opacity-70">
                        {tool.status === 'planned' ? 'Plan' : 'AI'}
                      </span>
                    ) : null}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
