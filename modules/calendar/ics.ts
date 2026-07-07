export type IcsFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export type IcsEventInput = {
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  uid?: string;
  recurrence?: {
    frequency: IcsFrequency;
    interval?: number;
    count?: number;
    until?: Date;
  };
};

export function generateIcsEvent(input: IcsEventInput): string {
  if (!input.title.trim()) throw new Error('Event title is required.');
  if (input.end <= input.start) throw new Error('Event end must be after event start.');

  const uid = input.uid ?? crypto.randomUUID();
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//filesuite.dev//browser-only//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeIcs(uid)}`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(input.start)}`,
    `DTEND:${formatIcsDate(input.end)}`,
    `SUMMARY:${escapeIcs(input.title)}`,
  ];

  if (input.description) lines.push(`DESCRIPTION:${escapeIcs(input.description)}`);
  if (input.location) lines.push(`LOCATION:${escapeIcs(input.location)}`);
  if (input.recurrence) lines.push(`RRULE:${formatRRule(input.recurrence)}`);

  lines.push('END:VEVENT', 'END:VCALENDAR');

  return foldIcsLines(lines).join('\r\n');
}

export function generateIcsSubscription(events: readonly IcsEventInput[]): string {
  const eventBlocks = events.flatMap((event) => {
    const ics = generateIcsEvent(event).split(/\r?\n/);
    return ics.filter((line) => line !== 'BEGIN:VCALENDAR' && line !== 'END:VCALENDAR');
  });

  return foldIcsLines([
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//filesuite.dev//browser-only//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...eventBlocks,
    'END:VCALENDAR',
  ]).join('\r\n');
}

export function mergeIcsFiles(contents: readonly string[]): string {
  const bodies = contents.flatMap((content) =>
    content
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter((line) => line && !['BEGIN:VCALENDAR', 'END:VCALENDAR', 'VERSION:2.0'].includes(line)),
  );

  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//filesuite.dev//merged-local//EN', ...bodies, 'END:VCALENDAR'].join(
    '\r\n',
  );
}

export function staticIcsDataUrl(ics: string): string {
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}

function formatRRule(rule: NonNullable<IcsEventInput['recurrence']>): string {
  const parts = [`FREQ=${rule.frequency}`];

  if (rule.interval) parts.push(`INTERVAL=${rule.interval}`);
  if (rule.count) parts.push(`COUNT=${rule.count}`);
  if (rule.until) parts.push(`UNTIL=${formatIcsDate(rule.until)}`);

  return parts.join(';');
}

function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function escapeIcs(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

function foldIcsLines(lines: readonly string[]): string[] {
  return lines.flatMap((line) => {
    if (line.length <= 75) return [line];

    const folded: string[] = [];
    let current = line;

    while (current.length > 75) {
      folded.push(current.slice(0, 75));
      current = ` ${current.slice(75)}`;
    }

    folded.push(current);
    return folded;
  });
}
