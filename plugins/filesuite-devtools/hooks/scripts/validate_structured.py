#!/usr/bin/env python3
# /// script
# requires-python = ">=3.9"
# dependencies = []
# ///
"""Validate JSON / JSONL / TOML files right after they are written. Stdlib only.

Two modes:

  Claude Code PostToolUse hook (reads hook JSON on stdin):
      python3 validate_structured.py --claude-hook
    -> on a parse error, returns decision=block with the exact line/column so Claude fixes it
       in the same turn instead of leaving a broken config behind.

  git pre-commit / CI:
      python3 validate_structured.py file.json other.toml ...
    -> exit 1 on any parse error

Skipped on purpose: JSON-with-comments files (tsconfig*.json, jsconfig*.json, *.jsonc,
.vscode/*.json, devcontainer.json) because they are not strict JSON. TOML needs Python 3.11+.
"""
from __future__ import annotations

import fnmatch
import json
import os
import sys

JSONC_GLOBS = ("tsconfig*.json", "jsconfig*.json", "*.jsonc", "devcontainer.json", ".eslintrc.json")


def is_jsonc(path: str) -> bool:
    name = os.path.basename(path)
    norm = path.replace("\\", "/")
    return any(fnmatch.fnmatch(name, g) for g in JSONC_GLOBS) or "/.vscode/" in f"/{norm}"


def validate(path: str) -> str | None:
    """Return an error string, or None if valid / not a checked type."""
    lower = path.lower()
    if not lower.endswith((".json", ".jsonl", ".ndjson", ".toml")) or is_jsonc(path):
        return None
    try:
        with open(path, "rb") as fh:
            data = fh.read()
    except OSError:
        return None
    text = data.decode("utf-8-sig", errors="replace")
    if lower.endswith(".json"):
        if not text.strip():
            return "empty file is not valid JSON"
        try:
            json.loads(text)
        except json.JSONDecodeError as exc:
            return f"line {exc.lineno} col {exc.colno}: {exc.msg}"
    elif lower.endswith((".jsonl", ".ndjson")):
        for lineno, line in enumerate(text.splitlines(), 1):
            if line.strip():
                try:
                    json.loads(line)
                except json.JSONDecodeError as exc:
                    return f"line {lineno} col {exc.colno}: {exc.msg}"
    else:
        try:
            import tomllib
        except ModuleNotFoundError:
            return None
        try:
            tomllib.loads(text)
        except tomllib.TOMLDecodeError as exc:
            return str(exc)
    return None


def claude_hook() -> int:
    try:
        event = json.load(sys.stdin)
    except json.JSONDecodeError:
        return 0
    path = (event.get("tool_input") or {}).get("file_path")
    if not path:
        return 0
    cwd = event.get("cwd") or os.getcwd()
    error = validate(path if os.path.isabs(path) else os.path.join(cwd, path))
    if error:
        print(json.dumps({
            "decision": "block",
            "reason": f"filesuite validate_structured: {path} is no longer valid ({error}). Fix the syntax now.",
        }))
    return 0


def main(argv: list[str]) -> int:
    if argv[:1] == ["--claude-hook"]:
        return claude_hook()
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__)
        return 0
    failed = False
    for path in argv:
        error = validate(path)
        if error:
            failed = True
            print(f"{path}: {error}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
