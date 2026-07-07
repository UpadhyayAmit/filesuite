'use client';

import { AlertCircle, CheckCircle, Loader2, Send } from 'lucide-react';
import { useState } from 'react';

const SUBJECTS = ['Tool request', 'Bug report', 'Business enquiry', 'Privacy question', 'General enquiry'];
type Status = 'idle' | 'sending' | 'success' | 'error';

export function EnquiryForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [honey, setHoney] = useState('');
  const [startedAt] = useState(() => Date.now());
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('sending');
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const response = await fetch('/api/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message, _honey: honey, startedAt: String(startedAt) }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string; mailto?: string; sent?: boolean };

      if (!data.ok) {
        setStatus('error');
        setErrorMsg(data.error ?? 'Please check the form and try again.');
        return;
      }

      setStatus('success');
      setSuccessMsg(data.sent ? 'Enquiry sent. I will reply from the File Suite inbox.' : 'Enquiry validated. Your email app should open now.');
      if (data.mailto) window.location.href = data.mailto;
    } catch {
      setStatus('error');
      setErrorMsg('Could not validate the enquiry. Please try again.');
    }
  }

  return (
    <form id="enquiry" onSubmit={submit} className="grid gap-5 rounded-2xl border border-line bg-white p-6 shadow-[0_20px_70px_rgba(22,34,51,0.1)]">
      <div>
        <h2 className="text-2xl font-semibold text-ink">Enquiry</h2>
        <p className="mt-1 text-sm leading-6 text-muted">Validated first to reduce fake email and spam. Your message opens in your email app after validation.</p>
      </div>
      <input
        type="text"
        name="_honey"
        value={honey}
        onChange={(event) => setHoney(event.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute h-0 w-0 opacity-0"
      />
      <label className="grid gap-2 text-sm font-semibold text-ink">
        Name
        <input
          required
          maxLength={100}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="h-12 rounded-xl border border-line bg-paper px-4 text-sm font-normal outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          placeholder="Your name"
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-ink">
        Email
        <input
          type="email"
          required
          maxLength={254}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-12 rounded-xl border border-line bg-paper px-4 text-sm font-normal outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          placeholder="you@example.com"
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-ink">
        Enquiry type
        <select
          required
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          className="h-12 rounded-xl border border-line bg-paper px-4 text-sm font-normal outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        >
          <option value="">Select a type</option>
          {SUBJECTS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-semibold text-ink">
        <span className="flex items-center justify-between">
          Message
          <span className="text-xs font-normal text-muted">{message.length}/3000</span>
        </span>
        <textarea
          required
          maxLength={3000}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={6}
          className="min-h-36 rounded-xl border border-line bg-paper px-4 py-3 text-sm font-normal outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          placeholder="Tell me what you want filesuite.dev to support."
        />
      </label>
      {status === 'error' ? (
        <p className="flex items-start gap-2 rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-ink">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-coral" aria-hidden="true" />
          {errorMsg}
        </p>
      ) : null}
      {status === 'success' ? (
        <p className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {successMsg}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={status === 'sending'}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-coral px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_35px_rgba(255,107,53,0.25)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {status === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
        {status === 'sending' ? 'Validating...' : 'Send enquiry'}
      </button>
    </form>
  );
}
