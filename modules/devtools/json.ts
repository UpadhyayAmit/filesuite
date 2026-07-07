export type JsonValidationResult =
  | { ok: true; formatted: string; value: unknown }
  | { ok: false; error: string; line?: number; column?: number };

export function formatJson(input: string, spaces = 2): JsonValidationResult {
  try {
    const value = JSON.parse(input);
    return { ok: true, value, formatted: JSON.stringify(value, null, spaces) };
  } catch (error) {
    return parseJsonError(error);
  }
}

export function minifyJson(input: string): JsonValidationResult {
  try {
    const value = JSON.parse(input);
    return { ok: true, value, formatted: JSON.stringify(value) };
  } catch (error) {
    return parseJsonError(error);
  }
}

function parseJsonError(error: unknown): JsonValidationResult {
  const message = error instanceof Error ? error.message : 'Invalid JSON.';
  const positionMatch = /position\s+(\d+)/i.exec(message);

  if (!positionMatch) return { ok: false, error: message };

  const position = Number(positionMatch[1]);
  return { ok: false, error: message, column: position + 1 };
}
