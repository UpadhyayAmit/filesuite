import { resolveMx } from 'node:dns/promises';
import { NextRequest, NextResponse } from 'next/server';
import { hasZohoMailConfig, sendEnquiryEmail } from '@/lib/server/mail';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BLOCKED_DOMAINS = new Set([
  '10minutemail.com',
  'guerrillamail.com',
  'mailinator.com',
  'tempmail.com',
  'temp-mail.org',
  'throwawaymail.com',
  'yopmail.com',
  ...csv(process.env.BLOCKED_EMAIL_DOMAINS),
]);

const BLOCKED_EMAILS = new Set(csv(process.env.BLOCKED_EMAILS));
const SUBJECTS = new Set(['Tool request', 'Bug report', 'Business enquiry', 'Privacy question', 'General enquiry']);
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? 'unknown';

  if (!checkRateLimit(ip)) {
    return NextResponse.json({ ok: false, error: 'Too many enquiries. Please wait a few minutes.' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request.' }, { status: 400 });
  }

  const { name, email, subject, message, _honey, startedAt } = body as Record<string, string>;

  if (_honey) return NextResponse.json({ ok: true });
  if (startedAt && Date.now() - Number(startedAt) < 2500) return NextResponse.json({ ok: true });

  if (!name || name.trim().length < 2 || name.length > 100) {
    return NextResponse.json({ ok: false, error: 'Please enter your real name.' }, { status: 400 });
  }

  const visitorEmail = normalizeEmail(email ?? '');
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!visitorEmail || !emailRegex.test(visitorEmail) || visitorEmail.length > 254) {
    return NextResponse.json({ ok: false, error: 'Please enter a valid email address.' }, { status: 400 });
  }

  const domain = getDomain(visitorEmail);
  if (BLOCKED_EMAILS.has(visitorEmail) || BLOCKED_DOMAINS.has(domain)) {
    return NextResponse.json({ ok: false, error: 'This email address cannot be used for enquiries.' }, { status: 400 });
  }

  if (!(await hasMxRecord(domain))) {
    return NextResponse.json({ ok: false, error: 'Please use an email address that can receive replies.' }, { status: 400 });
  }

  if (!subject || !SUBJECTS.has(subject.trim())) {
    return NextResponse.json({ ok: false, error: 'Please select a valid enquiry type.' }, { status: 400 });
  }

  if (!message || message.trim().length < 10 || message.length > 3000) {
    return NextResponse.json({ ok: false, error: 'Message must be 10-3000 characters.' }, { status: 400 });
  }

  if (tooManyLinks(message) || hasSpamContent(`${name}\n${subject}\n${message}`)) {
    return NextResponse.json({ ok: false, error: 'This enquiry looks like spam. Please remove promotional links or suspicious wording.' }, { status: 400 });
  }

  if (hasZohoMailConfig) {
    await sendEnquiryEmail({
      visitorName: name.trim(),
      visitorEmail,
      subject: subject.trim(),
      message: message.trim(),
    });
    return NextResponse.json({ ok: true, sent: true });
  }

  return NextResponse.json({ ok: true, sent: false, mailto: makeMailto(name.trim(), visitorEmail, subject.trim(), message.trim()) });
}

function checkRateLimit(ip: string) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 3) return false;
  entry.count += 1;
  return true;
}

function csv(value?: string) {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function getDomain(email: string) {
  return email.split('@')[1]?.toLowerCase() ?? '';
}

async function hasMxRecord(domain: string) {
  try {
    const records = await resolveMx(domain);
    return records.length > 0;
  } catch {
    return false;
  }
}

function tooManyLinks(value: string) {
  const links = value.match(/https?:\/\/|www\.|\.com\b|\.net\b|\.org\b/gi);
  return (links?.length ?? 0) > 2;
}

function hasSpamContent(value: string) {
  return [
    /\bcasino\b/i,
    /\bcrypto\b/i,
    /\bforex\b/i,
    /\bloan\b/i,
    /\bviagra\b/i,
    /\bbacklinks?\b/i,
    /\bseo\s+services?\b/i,
    /\bwhatsapp\s+marketing\b/i,
  ].some((pattern) => pattern.test(value)) || /(.)\1{12,}/.test(value);
}

function makeMailto(name: string, email: string, subject: string, message: string) {
  const encodedSubject = encodeURIComponent(`filesuite.dev enquiry: ${subject}`);
  const body = encodeURIComponent([`Name: ${name}`, `Email: ${email}`, `Type: ${subject}`, '', message].join('\n'));
  return `mailto:connect@filesuite.dev?subject=${encodedSubject}&body=${body}`;
}
