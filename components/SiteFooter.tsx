import Link from 'next/link';
import { MessageSquare, ShieldCheck } from 'lucide-react';

const footerGroups = [
  {
    title: 'Tools',
    links: [
      ['JSON Formatter', '/tools/json-formatter'],
      ['JWT Decoder', '/tools/jwt-decoder'],
      ['Regex Tester', '/tools/regex-tester'],
      ['PDF Merge', '/tools/pdf-merge'],
    ],
  },
  {
    title: 'Company',
    links: [
      ['About', '/about'],
      ['Privacy Policy', '/privacy'],
      ['Terms of Use', '/terms'],
    ],
  },
  {
    title: 'Contact',
    links: [
      ['Enquiry form', '/about#enquiry'],
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.2fr_2fr] lg:px-8">
        <div>
          <div className="flex items-center gap-2 text-lg font-semibold text-ink">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#ff6b35,#2563eb_58%,#7c3aed)] text-white">
              <ShieldCheck className="h-5 w-5 text-white" aria-hidden="true" />
            </span>
            File Suite
          </div>
          <p className="mt-3 max-w-sm text-sm leading-6 text-muted">
            Private developer utilities for API debugging, AI engineering, files, and secure local workflows.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-line bg-paper px-3 py-2 text-xs font-semibold text-ink">
            <ShieldCheck className="h-4 w-4 text-sage" aria-hidden="true" />
            Browser-first tools, optional account features
          </div>
        </div>
        <div className="grid gap-8 sm:grid-cols-3">
          {footerGroups.map((group) => (
            <div key={group.title}>
              <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{group.title}</h2>
              <ul className="mt-3 grid gap-2 text-sm">
                {group.links.map(([label, href]) => (
                  <li key={href}>
                    <Link href={href} className="inline-flex items-center gap-2 text-muted transition hover:text-ink">
                      {group.title === 'Contact' ? <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-line px-4 py-4 text-center text-xs text-muted">
        © {new Date().getFullYear()} File Suite. All rights reserved.
      </div>
    </footer>
  );
}
