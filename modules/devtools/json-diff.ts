import { diffLines } from '@/modules/filetools/diff';

export function diffJson(left: string, right: string): string {
  const normalizedLeft = JSON.stringify(JSON.parse(left), null, 2);
  const normalizedRight = JSON.stringify(JSON.parse(right), null, 2);

  return diffLines(normalizedLeft, normalizedRight)
    .map((chunk) => {
      if (chunk.type === 'added') return `+ ${chunk.value}`;
      if (chunk.type === 'removed') return `- ${chunk.value}`;
      return `  ${chunk.value}`;
    })
    .join('\n');
}

export function diffTextInput(input: string): string {
  const [left, right] = splitDiffInput(input);

  return diffLines(left, right)
    .map((chunk) => {
      if (chunk.type === 'added') return `+ ${chunk.value}`;
      if (chunk.type === 'removed') return `- ${chunk.value}`;
      return `  ${chunk.value}`;
    })
    .join('\n');
}

export function splitDiffInput(input: string): [string, string] {
  const separator = '\n---\n';
  const index = input.indexOf(separator);

  if (index === -1) {
    throw new Error('Put the left text above a line containing --- and the right text below it.');
  }

  return [input.slice(0, index), input.slice(index + separator.length)];
}
