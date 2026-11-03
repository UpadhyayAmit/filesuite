---
name: json-schema-infer
description: Generate a JSON Schema (draft 2020-12) from example JSON or JSONL, merging many samples so optional fields and union types are detected. Use when the user wants a schema for an API payload, a tool/function-calling definition, LLM structured output, a validator, or types derived from sample data.
---

# JSON Schema Infer

Deterministic schema inference. Use the script instead of hand-writing schemas from samples:
it does not miss fields, and `required` reflects what is present in *every* sample.

## Run

The script is `scripts/infer_schema.py` next to this file.

```bash
python3 <skill-dir>/scripts/infer_schema.py sample.json
python3 <skill-dir>/scripts/infer_schema.py a.json b.json c.json        # merge samples
python3 <skill-dir>/scripts/infer_schema.py events.jsonl --jsonl        # log/event streams
python3 <skill-dir>/scripts/infer_schema.py sample.json --strict        # LLM strict tool schema
python3 <skill-dir>/scripts/infer_schema.py sample.json --no-examples -o out.schema.json
```

## Choosing flags

| Goal | Flags |
|---|---|
| Anthropic / OpenAI strict tool or structured-output schema | `--strict --no-examples` |
| Documentation / OpenAPI component | default (keeps up to 3 string examples) |
| Samples contain real customer data | always `--no-examples` |

## After generating

- Tell the user how many samples were merged. One sample cannot reveal optional fields — ask for more
  if the schema will be used for validation.
- Suggest tightening the obvious spots the script cannot infer: `format` (`date-time`, `email`, `uri`),
  `enum` for small closed string sets, `minimum`/`maximum`.
