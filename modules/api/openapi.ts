import { parse as parseYaml } from 'yaml';

type Issue = {
  level: 'error' | 'warning';
  message: string;
};

export function validateOpenApi(input: string): string {
  const issues: Issue[] = [];
  const document = parseDocument(input);

  if (!document || typeof document !== 'object' || Array.isArray(document)) {
    throw new Error('OpenAPI document must be a JSON/YAML object.');
  }

  const root = document as Record<string, unknown>;
  const version = typeof root.openapi === 'string' ? root.openapi : typeof root.swagger === 'string' ? root.swagger : '';

  if (!version) issues.push({ level: 'error', message: 'Missing openapi or swagger version field.' });
  if (version && !/^(3\.\d+\.\d+|2\.0)$/.test(version)) {
    issues.push({ level: 'warning', message: `Version "${version}" is unusual. Expected OpenAPI 3.x.x or Swagger 2.0.` });
  }

  if (!isObject(root.info)) {
    issues.push({ level: 'error', message: 'Missing info object.' });
  } else {
    const info = root.info as Record<string, unknown>;
    if (typeof info.title !== 'string' || !info.title.trim()) issues.push({ level: 'error', message: 'info.title is required.' });
    if (typeof info.version !== 'string' || !info.version.trim()) issues.push({ level: 'error', message: 'info.version is required.' });
  }

  if (!isObject(root.paths)) {
    issues.push({ level: 'error', message: 'Missing paths object.' });
  } else {
    validatePaths(root.paths as Record<string, unknown>, issues);
  }

  if (version.startsWith('3') && root.servers !== undefined && !Array.isArray(root.servers)) {
    issues.push({ level: 'warning', message: 'servers should be an array in OpenAPI 3.' });
  }

  const summary = {
    valid: issues.every((issue) => issue.level !== 'error'),
    version: version || 'unknown',
    paths: isObject(root.paths) ? Object.keys(root.paths).length : 0,
    errors: issues.filter((issue) => issue.level === 'error').length,
    warnings: issues.filter((issue) => issue.level === 'warning').length,
    issues,
  };

  return JSON.stringify(summary, null, 2);
}

function validatePaths(paths: Record<string, unknown>, issues: Issue[]) {
  const methods = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']);

  for (const [path, pathItem] of Object.entries(paths)) {
    if (!path.startsWith('/')) issues.push({ level: 'warning', message: `Path "${path}" should start with /.` });
    if (!isObject(pathItem)) {
      issues.push({ level: 'error', message: `Path "${path}" must be an object.` });
      continue;
    }

    for (const [method, operation] of Object.entries(pathItem)) {
      if (!methods.has(method.toLowerCase())) continue;
      if (!isObject(operation)) {
        issues.push({ level: 'error', message: `${method.toUpperCase()} ${path} operation must be an object.` });
        continue;
      }

      const responses = (operation as Record<string, unknown>).responses;
      if (!isObject(responses)) {
        issues.push({ level: 'error', message: `${method.toUpperCase()} ${path} is missing responses.` });
      }
    }
  }
}

function parseDocument(input: string) {
  const trimmed = input.trim();
  if (!trimmed) throw new Error('Paste an OpenAPI JSON or YAML document.');
  return trimmed.startsWith('{') ? JSON.parse(trimmed) : parseYaml(trimmed);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
