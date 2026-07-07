import Papa from 'papaparse';

export function csvToJson(input: string): string {
  const result = Papa.parse<Record<string, string>>(input, {
    header: true,
    skipEmptyLines: true,
  });

  if (result.errors.length > 0) {
    throw new Error(result.errors[0]?.message ?? 'Invalid CSV.');
  }

  return JSON.stringify(result.data, null, 2);
}

export function jsonToCsv(input: string): string {
  const parsed = JSON.parse(input);
  if (!Array.isArray(parsed)) throw new Error('JSON must be an array of objects.');
  return Papa.unparse(parsed);
}

export function mergeCsv(contents: readonly string[]): string {
  const rows = contents.flatMap((content, index) => {
    const lines = content.trim().split(/\r?\n/);
    return index === 0 ? lines : lines.slice(1);
  });

  return rows.join('\n');
}
