import SparkMD5 from 'spark-md5';

export type HashAlgorithm = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';

export async function hashText(input: string, algorithm: HashAlgorithm = 'SHA-256'): Promise<string> {
  if (algorithm === 'MD5') return SparkMD5.hash(input);

  const buffer = await crypto.subtle.digest(algorithm, new TextEncoder().encode(input));
  return toHex(buffer);
}

export async function hashBytes(input: ArrayBuffer, algorithm: HashAlgorithm = 'SHA-256'): Promise<string> {
  if (algorithm === 'MD5') return SparkMD5.ArrayBuffer.hash(input);

  const buffer = await crypto.subtle.digest(algorithm, input);
  return toHex(buffer);
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
