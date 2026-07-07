const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.?';

export function generatePasswords(count = 8, length = 20): string {
  const alphabet = `${LOWER}${UPPER}${DIGITS}${SYMBOLS}`;
  const passwords = Array.from({ length: count }, () => makePassword(length, alphabet));

  return passwords.join('\n');
}

export function decodeCertificate(input: string): string {
  const body = input
    .replace(/-----BEGIN CERTIFICATE-----/g, '')
    .replace(/-----END CERTIFICATE-----/g, '')
    .replace(/\s+/g, '');

  if (!body) throw new Error('Paste a PEM certificate.');

  const bytes = Uint8Array.from(atob(body), (char) => char.charCodeAt(0));
  const strings = extractDerStrings(bytes);

  return JSON.stringify(
    {
      format: 'X.509 PEM',
      sizeBytes: bytes.byteLength,
      notBeforeCandidates: strings.filter((value) => /^\d{12}Z$|^\d{14}Z$/.test(value)).slice(0, 2),
      commonTextFields: strings.filter((value) => /[a-zA-Z]/.test(value)).slice(0, 30),
      note: 'This is a local lightweight PEM inspector. Full X.509 ASN.1 field mapping can be added with a dedicated ASN.1 parser.',
    },
    null,
    2,
  );
}

function makePassword(length: number, alphabet: string) {
  const required = [pick(LOWER), pick(UPPER), pick(DIGITS), pick(SYMBOLS)];
  const remaining = Array.from({ length: Math.max(length - required.length, 0) }, () => pick(alphabet));
  return shuffle([...required, ...remaining]).join('');
}

function pick(alphabet: string) {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return alphabet[buffer[0] % alphabet.length];
}

function shuffle(values: string[]) {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    const swap = buffer[0] % (index + 1);
    [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
  }
  return shuffled;
}

function extractDerStrings(bytes: Uint8Array) {
  const values: string[] = [];

  for (let index = 0; index < bytes.length - 2; index += 1) {
    const tag = bytes[index];
    if (![0x0c, 0x13, 0x16, 0x17, 0x18].includes(tag)) continue;

    const length = bytes[index + 1];
    if (length > 127 || length < 2 || index + 2 + length > bytes.length) continue;

    const text = new TextDecoder().decode(bytes.slice(index + 2, index + 2 + length));
    if (/^[\x20-\x7e]+$/.test(text)) values.push(text);
  }

  return [...new Set(values)];
}
