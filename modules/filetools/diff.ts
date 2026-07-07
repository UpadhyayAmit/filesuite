export type DiffChunk = {
  type: 'same' | 'added' | 'removed';
  value: string;
};

export function diffLines(left: string, right: string): DiffChunk[] {
  const a = left.split(/\r?\n/);
  const b = right.split(/\r?\n/);
  const table = buildLcsTable(a, b);
  const result: DiffChunk[] = [];
  let i = a.length;
  let j = b.length;

  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      result.unshift({ type: 'same', value: a[i - 1] });
      i -= 1;
      j -= 1;
    } else if (table[i - 1][j] >= table[i][j - 1]) {
      result.unshift({ type: 'removed', value: a[i - 1] });
      i -= 1;
    } else {
      result.unshift({ type: 'added', value: b[j - 1] });
      j -= 1;
    }
  }

  while (i > 0) result.unshift({ type: 'removed', value: a[(i -= 1)] });
  while (j > 0) result.unshift({ type: 'added', value: b[(j -= 1)] });

  return result;
}

function buildLcsTable(a: readonly string[], b: readonly string[]) {
  const table = Array.from({ length: a.length + 1 }, () => Array<number>(b.length + 1).fill(0));

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      table[i][j] = a[i - 1] === b[j - 1] ? table[i - 1][j - 1] + 1 : Math.max(table[i - 1][j], table[i][j - 1]);
    }
  }

  return table;
}
