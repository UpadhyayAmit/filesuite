const FIELD_NAMES = ['minute', 'hour', 'day of month', 'month', 'day of week'] as const;

export function explainCron(input: string): string {
  const expression = input.trim();
  const parts = expression.split(/\s+/);

  if (parts.length !== 5) {
    throw new Error('Use a standard five-field cron expression: minute hour day-of-month month day-of-week.');
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  return [
    `Expression: ${expression}`,
    '',
    `Minute: ${describeField(minute, 0, 59)}`,
    `Hour: ${describeField(hour, 0, 23)}`,
    `Day of month: ${describeField(dayOfMonth, 1, 31)}`,
    `Month: ${describeField(month, 1, 12)}`,
    `Day of week: ${describeField(dayOfWeek, 0, 7)}`,
    '',
    summarize(minute, hour, dayOfMonth, month, dayOfWeek),
    '',
    `Fields: ${FIELD_NAMES.join(', ')}`,
  ].join('\n');
}

function describeField(value: string, min: number, max: number): string {
  if (value === '*') return `every allowed value (${min}-${max})`;
  if (/^\*\/\d+$/.test(value)) return `every ${value.slice(2)} units`;
  if (/^\d+$/.test(value)) return `exactly ${value}`;
  if (/^\d+-\d+$/.test(value)) return `range ${value}`;
  if (/^(\d+,)+\d+$/.test(value)) return `specific values ${value}`;
  return `custom expression "${value}"`;
}

function summarize(minute: string, hour: string, dayOfMonth: string, month: string, dayOfWeek: string): string {
  if (minute === '0' && hour === '0' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return 'Summary: runs every day at midnight.';
  }

  if (minute === '0' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return 'Summary: runs at the start of every hour.';
  }

  if (minute.startsWith('*/') && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return `Summary: runs every ${minute.slice(2)} minutes.`;
  }

  if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return `Summary: runs when minute="${minute}" and hour="${hour}" every day.`;
  }

  return 'Summary: runs when all five fields match.';
}
