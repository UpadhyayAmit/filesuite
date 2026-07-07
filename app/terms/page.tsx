import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Use | filesuite.dev',
  description: 'Terms of use for filesuite.dev.',
};

export default function TermsPage() {
  return (
    <main className="bg-paper">
      <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-coral">File Suite</p>
        <h1 className="mt-3 text-4xl font-medium tracking-[-0.02em] text-ink">Terms of Use</h1>
        <p className="mt-2 text-sm text-muted">Last updated: July 7, 2026</p>
        <div className="mt-8 grid gap-5 text-base leading-8 text-muted [&_a]:text-sage [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-ink">
          <h2>Use of tools</h2>
          <p>You are responsible for the content you process and for validating output before using it in production systems.</p>
          <h2>No professional advice</h2>
          <p>filesuite.dev provides technical utilities. It does not provide legal, financial, medical, or compliance advice.</p>
          <h2>Optional accounts</h2>
          <p>Accounts may be used later for feedback, voting, and preferences. Browser-only utilities remain usable without an account.</p>
          <h2>Online AI Mode</h2>
          <p>Online AI tools may send approved content to model providers. Those tools must show a separate consent step.</p>
          <h2>Contact</h2>
          <p>Questions about these terms: <a href="mailto:connect@filesuite.dev">connect@filesuite.dev</a>.</p>
        </div>
      </article>
    </main>
  );
}
