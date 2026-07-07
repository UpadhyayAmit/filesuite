import type { Metadata } from 'next';
import { Code2, ShieldCheck, Sparkles } from 'lucide-react';
import { EnquiryForm } from '@/components/EnquiryForm';

export const metadata: Metadata = {
  title: 'About | filesuite.dev',
  description: 'About filesuite.dev and its privacy-first developer utility philosophy.',
};

export default function AboutPage() {
  return (
    <main className="bg-paper">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_420px] lg:px-8">
        <section className="grid content-start gap-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-coral">About File Suite</p>
            <h1 className="mt-3 max-w-3xl text-3xl font-medium tracking-[-0.02em] text-ink md:text-4xl">
              Browser-first tools for developers and AI engineers.
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">
              File Suite is built by Amit Upadhyay as a private, browser-first toolbox for daily developer workflows:
              API debugging, JSON/JWT inspection, encoding, diffing, cron checks, file conversion, and AI engineering helpers.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              [ShieldCheck, 'Privacy first', 'Browser-only tools do not upload file or text content.'],
              [Code2, 'Developer focused', 'The first tools are high-frequency API and DevOps utilities.'],
              [Sparkles, 'AI aware', 'AI features are clearly separated as opt-in online workflows.'],
            ].map(([Icon, title, text]) => (
              <div key={String(title)} className="rounded-2xl border border-line bg-white p-5 shadow-soft">
                <Icon className="h-6 w-6 text-sage" aria-hidden="true" />
                <h2 className="mt-4 font-semibold text-ink">{title as string}</h2>
                <p className="mt-2 text-sm leading-6 text-muted">{text as string}</p>
              </div>
            ))}
          </div>
          <section className="rounded-2xl border border-line bg-white p-6 shadow-soft">
            <h2 className="text-2xl font-semibold text-ink">Contact</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              Use the enquiry form for tool requests, bugs, privacy questions, or business messages.
            </p>
            <a href="#enquiry" className="mt-4 inline-flex rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-coral">
              Open enquiry form
            </a>
          </section>
        </section>
        <EnquiryForm />
      </div>
    </main>
  );
}
