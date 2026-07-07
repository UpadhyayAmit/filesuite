'use client';

import Script from 'next/script';
import { Cookie, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';

type Consent = 'accepted' | 'declined' | null;

const COOKIE_NAME = 'filesuite_cookie_consent';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function CookieConsent() {
  const [consent, setConsent] = useState<Consent>(null);
  const [ready, setReady] = useState(false);
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID;

  useEffect(() => {
    setConsent(readConsentCookie());
    setReady(true);
  }, []);

  function saveConsent(value: Exclude<Consent, null>) {
    document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
    setConsent(value);
  }

  return (
    <>
      {consent === 'accepted' && clarityId ? (
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${clarityId}");
          `}
        </Script>
      ) : null}

      {ready && consent === null ? (
        <section className="fixed inset-x-4 bottom-4 z-[90] mx-auto max-w-3xl rounded-2xl border border-line bg-white p-4 text-ink shadow-[0_22px_80px_rgba(22,34,51,0.18)] md:flex md:items-center md:gap-5">
          <div className="flex min-w-0 gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef4ff] text-blue-700">
              <Cookie className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-bold">Cookie permission</h2>
              <p className="mt-1 text-sm leading-6 text-muted">
                File Suite uses essential cookies for optional sign-in. With your permission, Microsoft Clarity helps us understand aggregate page usage.
                Tool content and files are never sent for analytics.
              </p>
            </div>
          </div>
          <div className="mt-4 flex shrink-0 gap-2 md:mt-0">
            <button
              type="button"
              onClick={() => saveConsent('declined')}
              className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-muted transition hover:border-slate-400 hover:text-ink"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={() => saveConsent('accepted')}
              className="inline-flex items-center gap-2 rounded-full bg-coral px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(255,107,53,0.25)] transition hover:bg-[#f25f2b]"
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Allow
            </button>
          </div>
        </section>
      ) : null}
    </>
  );
}

function readConsentCookie(): Consent {
  const match = document.cookie
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${COOKIE_NAME}=`));

  const value = match?.split('=')[1];
  return value === 'accepted' || value === 'declined' ? value : null;
}
