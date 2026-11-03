#!/usr/bin/env python3
# /// script
# requires-python = ">=3.9"
# dependencies = []
# ///
"""Infer a JSON Schema (draft 2020-12) from one or more JSON samples. Stdlib only.

Merging across samples is what makes this useful for LLM structured output / tool schemas:
a field is `required` only if it appears in every sample, and differing types become a union.

Usage:
  python3 infer_schema.py sample.json
  python3 infer_schema.py a.json b.json c.json            # merge several samples
  python3 infer_schema.py events.jsonl --jsonl            # one sample per line
  cat sample.json | python3 infer_schema.py -
  python3 infer_schema.py sample.json --strict            # additionalProperties: false (OpenAI/Anthropic strict tools)
  python3 infer_schema.py sample.json --title Order -o order.schema.json
"""
from __future__ import annotations

import argparse
import json
import sys
from typing import Any, Dict

Schema = Dict[str, Any]


def type_name(value: Any) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "boolean"
    if isinstance(value, int):
        return "integer"
    if isinstance(value, float):
        return "number"
    if isinstance(value, str):
        return "string"
    if isinstance(value, list):
        return "array"
    return "object"


class Node:
    """Accumulates observations of every value seen at one JSON path."""

    def __init__(self) -> None:
        self.count = 0
        self.types: set[str] = set()
        self.props: dict[str, Node] = {}
        self.prop_counts: dict[str, int] = {}
        self.objects_seen = 0
        self.items: Node | None = None
        self.str_examples: list[str] = []

    def add(self, value: Any) -> None:
        self.count += 1
        t = type_name(value)
        self.types.add(t)
        if t == "object":
            self.objects_seen += 1
            for key, item in value.items():
                self.props.setdefault(key, Node()).add(item)
                self.prop_counts[key] = self.prop_counts.get(key, 0) + 1
        elif t == "array":
            self.items = self.items or Node()
            for item in value:
                self.items.add(item)
        elif t == "string" and len(self.str_examples) < 3 and value not in self.str_examples:
            self.str_examples.append(value)

    def to_schema(self, strict: bool, examples: bool) -> Schema:
        types = set(self.types)
        if {"integer", "number"} <= types:
            types.discard("integer")
        variants = [self._schema_for(t, strict, examples) for t in sorted(types)]
        if not variants:
            return {}
        if len(variants) == 1:
            return variants[0]
        if all(set(v) == {"type"} for v in variants):
            return {"type": [v["type"] for v in variants]}
        return {"anyOf": variants}

    def _schema_for(self, t: str, strict: bool, examples: bool) -> Schema:
        if t == "object":
            props = {k: n.to_schema(strict, examples) for k, n in self.props.items()}
            required = [k for k, c in self.prop_counts.items() if c == self.objects_seen]
            schema: Schema = {"type": "object", "properties": props}
            if strict:
                # Strict tool-calling modes require every property listed in `required`;
                # optional fields are expressed as a union with null.
                for k in props:
                    if k not in required:
                        props[k] = {"anyOf": [props[k], {"type": "null"}]}
                schema["required"] = list(props)
                schema["additionalProperties"] = False
            elif required:
                schema["required"] = required
            return schema
        if t == "array":
            return {"type": "array", "items": self.items.to_schema(strict, examples) if self.items and self.items.count else {}}
        schema = {"type": t}
        if t == "string" and examples and self.str_examples:
            schema["examples"] = self.str_examples
        return schema


def load_samples(paths: list[str], jsonl: bool) -> list[Any]:
    samples: list[Any] = []
    for path in paths:
        if path == "-":
            text = sys.stdin.read()
        else:
            with open(path, encoding="utf-8") as fh:
                text = fh.read()
        if jsonl:
            for lineno, line in enumerate(text.splitlines(), 1):
                if line.strip():
                    try:
                        samples.append(json.loads(line))
                    except json.JSONDecodeError as exc:
                        raise ValueError(f"{path}:{lineno}: {exc.msg}") from exc
        else:
            try:
                samples.append(json.loads(text))
            except json.JSONDecodeError as exc:
                raise ValueError(f"{path}:{exc.lineno}:{exc.colno}: {exc.msg}") from exc
    return samples


def infer(samples: list[Any], strict: bool = False, examples: bool = True, title: str | None = None) -> Schema:
    root = Node()
    for sample in samples:
        root.add(sample)
    schema: Schema = {"$schema": "https://json-schema.org/draft/2020-12/schema"}
    if title:
        schema["title"] = title
    schema.update(root.to_schema(strict, examples))
    return schema


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("paths", nargs="+", help="JSON files, or '-' for stdin")
    parser.add_argument("--jsonl", action="store_true", help="treat each non-empty line as a sample")
    parser.add_argument("--strict", action="store_true", help="LLM strict mode: all keys required, optional -> nullable, no extra keys")
    parser.add_argument("--no-examples", action="store_true", help="omit string examples (avoid leaking sample data)")
    parser.add_argument("--title")
    parser.add_argument("-o", "--output", help="write schema to file instead of stdout")
    args = parser.parse_args(argv)

    try:
        samples = load_samples(args.paths, args.jsonl)
    except (OSError, ValueError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    if not samples:
        print("error: no samples found", file=sys.stderr)
        return 2

    out = json.dumps(infer(samples, args.strict, not args.no_examples, args.title), indent=2)
    if args.output:
        with open(args.output, "w", encoding="utf-8") as fh:
            fh.write(out + "\n")
        print(f"wrote {args.output} from {len(samples)} sample(s)", file=sys.stderr)
    else:
        print(out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
