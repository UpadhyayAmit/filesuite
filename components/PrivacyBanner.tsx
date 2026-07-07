import { ShieldCheck } from 'lucide-react';
import { PRIVACY_GUARANTEES } from '@/lib/privacy';

export function PrivacyBanner() {
  return (
    <section className="border-b border-[#1f2a44] bg-ink text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-coral" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold">Privacy Mode is always on</p>
            <p className="max-w-3xl text-sm text-white/78">
              Browser-only tools process content in browser memory using TypeScript, Web Workers, and WASM. Auth is optional and separate.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-white/82">
          {PRIVACY_GUARANTEES.slice(0, 3).map((item) => (
            <span key={item} className="rounded-full border border-white/15 bg-white/5 px-3 py-1">
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
