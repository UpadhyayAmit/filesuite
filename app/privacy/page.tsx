import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | filesuite.dev',
  description: 'Privacy policy for filesuite.dev.',
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="July 8, 2026">
      <h2>Browser-only tools</h2>
      <p>Browser-only tools process files and text in your browser. filesuite.dev does not upload tool content for processing.</p>
      <h2>No tool-content storage</h2>
      <p>Browser-only tools do not use cookies, localStorage, sessionStorage, or IndexedDB to store your file or text content.</p>
      <h2 id="cookie-consent">Cookies and analytics</h2>
      <p>Essential cookies may be used for optional sign-in. Microsoft Clarity analytics loads only after cookie consent and is used to understand aggregate page usage, not tool input, output, or file content.</p>
      <h2>Optional account features</h2>
      <p>Sign-in and account features are optional and may use a trusted sign-in provider. Authentication is separate from local file processing.</p>
      <h2>Online AI Mode</h2>
      <p>AI podcast/audio tools require explicit opt-in before any text is sent to an online model provider.</p>
      <h2>Contact</h2>
      <p>Privacy questions: <a href="mailto:privacy@filesuite.dev">privacy@filesuite.dev</a>.</p>
    </LegalPage>
  );
}

function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <main className="bg-paper">
      <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-coral">File Suite</p>
        <h1 className="mt-3 text-4xl font-medium tracking-[-0.02em] text-ink">{title}</h1>
        <p className="mt-2 text-sm text-muted">Last updated: {updated}</p>
        <div className="mt-8 grid gap-5 text-base leading-8 text-muted [&_a]:text-sage [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-ink">
          {children}
        </div>
      </article>
    </main>
  );
}
