import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

export function yamlToJson(input: string, spaces = 2): string {
  return JSON.stringify(parseYaml(input), null, spaces);
}

export function jsonToYaml(input: string): string {
  return stringifyYaml(JSON.parse(input));
}

export function formatXml(input: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(input, 'application/xml');
  const parserError = doc.querySelector('parsererror');

  if (parserError) {
    throw new Error(parserError.textContent?.trim() || 'Invalid XML.');
  }

  const serialized = new XMLSerializer().serializeToString(doc);
  return serialized
    .replace(/(>)(<)(\/*)/g, '$1\n$2$3')
    .split('\n')
    .reduce<{ level: number; lines: string[] }>(
      (state, line) => {
        const trimmed = line.trim();
        if (!trimmed) return state;

        if (/^<\//.test(trimmed)) state.level = Math.max(state.level - 1, 0);
        state.lines.push(`${'  '.repeat(state.level)}${trimmed}`);
        if (/^<[^!?/][^>]*[^/]?>$/.test(trimmed)) state.level += 1;

        return state;
      },
      { level: 0, lines: [] },
    ).lines.join('\n');
}

export function encodeBase64(input: string): string {
  return btoa(unescape(encodeURIComponent(input)));
}

export function decodeBase64(input: string): string {
  return decodeURIComponent(escape(atob(input)));
}

export function urlEncode(input: string): string {
  return encodeURIComponent(input);
}

export function urlDecode(input: string): string {
  return decodeURIComponent(input);
}

export function generateUuid(): string {
  return crypto.randomUUID();
}

export function testRegex(pattern: string, flags: string, input: string): { matches: string[]; count: number } {
  const regex = new RegExp(pattern, flags.includes('g') ? flags : `${flags}g`);
  const matches = [...input.matchAll(regex)].map((match) => match[0]);
  return { matches, count: matches.length };
}
