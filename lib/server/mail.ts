import nodemailer from 'nodemailer';

export type EnquiryMailOptions = {
  visitorName: string;
  visitorEmail: string;
  subject: string;
  message: string;
};

export const hasZohoMailConfig = Boolean(process.env.ZOHO_SMTP_USER && process.env.ZOHO_SMTP_PASS);

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.ZOHO_SMTP_HOST ?? 'smtppro.zoho.com',
    port: Number.parseInt(process.env.ZOHO_SMTP_PORT ?? '465', 10),
    secure: process.env.ZOHO_SMTP_SECURE !== 'false',
    auth: {
      user: process.env.ZOHO_SMTP_USER,
      pass: process.env.ZOHO_SMTP_PASS,
    },
  });
}

export async function verifyZohoMail() {
  if (!hasZohoMailConfig) return false;
  return getTransporter().verify();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function sendEnquiryEmail(options: EnquiryMailOptions) {
  if (!hasZohoMailConfig) {
    throw new Error('Zoho SMTP is not configured.');
  }

  const from = process.env.CONTACT_FROM_EMAIL ?? process.env.ZOHO_SMTP_USER ?? 'connect@filesuite.dev';
  const to = process.env.CONTACT_TO_EMAIL ?? 'connect@filesuite.dev';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.filesuite.dev';
  const visitorName = escapeHtml(options.visitorName);
  const visitorEmail = escapeHtml(options.visitorEmail);
  const subject = escapeHtml(options.subject);
  const message = escapeHtml(options.message).replace(/\n/g, '<br>');

  await getTransporter().sendMail({
    from: `File Suite <${from}>`,
    to,
    replyTo: options.visitorEmail,
    subject: `[File Suite] ${options.subject}`,
    text: `Name: ${options.visitorName}\nEmail: ${options.visitorEmail}\nType: ${options.subject}\n\n${options.message}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#111827">
        <div style="font-size:13px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#ff6b35">File Suite</div>
        <h1 style="margin:12px 0 8px;font-size:24px">New enquiry</h1>
        <table style="width:100%;border-collapse:collapse;margin:18px 0">
          <tr><td style="padding:8px 0;color:#6b7280;width:110px">Name</td><td style="padding:8px 0;font-weight:700">${visitorName}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Email</td><td style="padding:8px 0">${visitorEmail}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Type</td><td style="padding:8px 0">${subject}</td></tr>
        </table>
        <div style="border:1px solid #e5e7eb;border-radius:14px;background:#f8fafc;padding:16px;line-height:1.65">${message}</div>
        <p style="margin-top:20px;color:#94a3b8;font-size:12px">Sent from <a href="${siteUrl}" style="color:#2563eb">${siteUrl}</a>.</p>
      </div>
    `,
  });
}
