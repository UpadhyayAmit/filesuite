export type DecodedJwt = {
  header: unknown;
  payload: unknown;
  signature: string;
};

export function decodeJwt(token: string): DecodedJwt {
  const parts = token.trim().split('.');

  if (parts.length !== 3) {
    throw new Error('JWT must have header, payload, and signature sections.');
  }

  return {
    header: JSON.parse(base64UrlDecode(parts[0])),
    payload: JSON.parse(base64UrlDecode(parts[1])),
    signature: parts[2],
  };
}

export function formatJwt(token: string): string {
  const decoded = decodeJwt(token);

  return JSON.stringify(
    {
      header: decoded.header,
      payload: decoded.payload,
      signaturePreview: `${decoded.signature.slice(0, 12)}...`,
      note: 'Decoded locally. Signature verification requires a public key or secret.',
    },
    null,
    2,
  );
}

function base64UrlDecode(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  return decodeURIComponent(escape(atob(padded)));
}
