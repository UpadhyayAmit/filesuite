export function generateJsonSchema(input: string): string {
  const value = JSON.parse(input);
  const schema = inferSchema(value);

  return JSON.stringify(
    {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      ...schema,
    },
    null,
    2,
  );
}

type JsonSchema = Record<string, unknown>;

function inferSchema(value: unknown): JsonSchema {
  if (value === null) return { type: 'null' };
  if (Array.isArray(value)) return inferArraySchema(value);

  switch (typeof value) {
    case 'string':
      return { type: 'string', examples: [value] };
    case 'number':
      return { type: Number.isInteger(value) ? 'integer' : 'number', examples: [value] };
    case 'boolean':
      return { type: 'boolean', examples: [value] };
    case 'object':
      return inferObjectSchema(value as Record<string, unknown>);
    default:
      return {};
  }
}

function inferObjectSchema(value: Record<string, unknown>): JsonSchema {
  const entries = Object.entries(value);

  return {
    type: 'object',
    properties: Object.fromEntries(entries.map(([key, item]) => [key, inferSchema(item)])),
    required: entries.map(([key]) => key),
    additionalProperties: false,
  };
}

function inferArraySchema(value: unknown[]): JsonSchema {
  if (value.length === 0) return { type: 'array', items: {} };

  const itemSchemas = value.map(inferSchema);
  return {
    type: 'array',
    items: mergeSchemas(itemSchemas),
  };
}

function mergeSchemas(schemas: JsonSchema[]): JsonSchema {
  const [first, ...rest] = schemas;
  if (!first) return {};

  if (rest.every((schema) => JSON.stringify(schema) === JSON.stringify(first))) return first;

  const types = [...new Set(schemas.map((schema) => schema.type).filter(Boolean))];
  if (types.length === 1 && types[0] === 'object') {
    const properties = Object.assign({}, ...schemas.map((schema) => schema.properties ?? {}));
    const requiredSets = schemas.map((schema) => new Set(Array.isArray(schema.required) ? schema.required : []));
    const required = [...requiredSets[0]].filter((key) => requiredSets.every((set) => set.has(key)));

    return { type: 'object', properties, required, additionalProperties: false };
  }

  return { anyOf: schemas };
}
