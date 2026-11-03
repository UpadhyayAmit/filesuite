import Link from 'next/link';
import { Bot, ShieldCheck } from 'lucide-react';
import { NavBarAuth } from './NavBarAuth';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/92 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-ink">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#ff6b35,#2563eb_58%,#7c3aed)] text-white shadow-sm">
            <ShieldCheck className="h-6 w-6 text-white" aria-hidden="true" />
          </span>
          <span>File Suite</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/agents"
            className="hidden items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm font-semibold text-ink transition hover:border-sage sm:inline-flex"
          >
            <Bot className="h-4 w-4 text-[#6d28d9]" aria-hidden="true" />
            For agents
          </Link>
          <NavBarAuth />
        </div>
      </div>
    </header>
  );
}
