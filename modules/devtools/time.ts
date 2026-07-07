export function convertUnixTimestamp(input: string): string {
  const trimmed = input.trim();
  const timestamp = trimmed ? Number(trimmed) : Date.now();

  if (!Number.isFinite(timestamp)) {
    throw new Error('Enter a valid Unix timestamp or leave input empty for now.');
  }

  const milliseconds = timestamp < 10_000_000_000 ? timestamp * 1000 : timestamp;
  const date = new Date(milliseconds);

  if (Number.isNaN(date.getTime())) {
    throw new Error('Timestamp is outside the supported JavaScript date range.');
  }

  return JSON.stringify(
    {
      unixSeconds: Math.floor(date.getTime() / 1000),
      unixMilliseconds: date.getTime(),
      utc: date.toISOString(),
      local: date.toString(),
      timezoneOffsetMinutes: date.getTimezoneOffset(),
    },
    null,
    2,
  );
}
