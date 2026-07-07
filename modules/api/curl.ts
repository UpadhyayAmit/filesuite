export function convertCurl(input: string): string {
  const tokens = tokenize(input.trim());
  if (tokens[0] !== 'curl') throw new Error('Command must start with curl.');

  const request = parseCurl(tokens);
  const headers = Object.fromEntries(request.headers);
  const fetchCode = [
    `await fetch(${JSON.stringify(request.url)}, {`,
    `  method: ${JSON.stringify(request.method)},`,
    Object.keys(headers).length ? `  headers: ${JSON.stringify(headers, null, 2).replace(/\n/g, '\n  ')},` : '',
    request.body ? `  body: ${JSON.stringify(request.body)},` : '',
    '});',
  ].filter(Boolean).join('\n');

  const pythonHeaders = JSON.stringify(headers, null, 2).replace(/true/g, 'True').replace(/false/g, 'False');
  const pythonCode = [
    'import requests',
    '',
    Object.keys(headers).length ? `headers = ${pythonHeaders}` : 'headers = {}',
    request.body ? `data = ${JSON.stringify(request.body)}` : 'data = None',
    `response = requests.request(${JSON.stringify(request.method)}, ${JSON.stringify(request.url)}, headers=headers, data=data)`,
    'print(response.text)',
  ].join('\n');

  const csharpHeaders = request.headers.map(([key, value]) => `request.Headers.TryAddWithoutValidation("${escapeCsharp(key)}", "${escapeCsharp(value)}");`);
  const csharpCode = [
    'using var client = new HttpClient();',
    `using var request = new HttpRequestMessage(HttpMethod.${toCsharpMethod(request.method)}, "${escapeCsharp(request.url)}");`,
    ...csharpHeaders,
    request.body ? `request.Content = new StringContent("${escapeCsharp(request.body)}");` : '',
    'using var response = await client.SendAsync(request);',
    'Console.WriteLine(await response.Content.ReadAsStringAsync());',
  ].filter(Boolean).join('\n');

  return [
    'FETCH',
    fetchCode,
    '',
    'PYTHON REQUESTS',
    pythonCode,
    '',
    'C# HTTPCLIENT',
    csharpCode,
  ].join('\n');
}

function parseCurl(tokens: string[]) {
  let method = 'GET';
  let body = '';
  let url = '';
  const headers: Array<[string, string]> = [];

  for (let index = 1; index < tokens.length; index += 1) {
    const token = tokens[index];
    const next = tokens[index + 1] ?? '';

    if (['-X', '--request'].includes(token)) {
      method = next.toUpperCase();
      index += 1;
    } else if (['-H', '--header'].includes(token)) {
      const separator = next.indexOf(':');
      if (separator > -1) headers.push([next.slice(0, separator).trim(), next.slice(separator + 1).trim()]);
      index += 1;
    } else if (['-d', '--data', '--data-raw', '--data-binary'].includes(token)) {
      body = next;
      if (method === 'GET') method = 'POST';
      index += 1;
    } else if (!token.startsWith('-')) {
      url = token;
    }
  }

  if (!url) throw new Error('Could not find the request URL.');
  return { method, url, headers, body };
}

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | '' = '';

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (quote) {
      if (char === quote) quote = '';
      else current += char;
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
    } else if (/\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
    } else if (char === '\\' && input[index + 1]) {
      index += 1;
      current += input[index];
    } else {
      current += char;
    }
  }

  if (current) tokens.push(current);
  return tokens;
}

function toCsharpMethod(method: string) {
  const normalized = method.toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function escapeCsharp(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
