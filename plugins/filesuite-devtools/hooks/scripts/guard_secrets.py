#!/usr/bin/env python3
# /// script
# requires-python = ">=3.9"
# dependencies = []
# ///
"""Block secrets from being written to files. Stdlib only.

Two modes, same detection rules:

  Claude Code PreToolUse hook (reads hook JSON on stdin):
      python3 guard_secrets.py --claude-hook
    -> hard secrets: permissionDecision=deny (edit is blocked, reason is shown to Claude)
    -> JWT-looking strings: permissionDecision=ask (user confirms)

  git pre-commit / CI (scans file paths):
      python3 guard_secrets.py [--strict] path/to/file ...
    -> exit 1 on hard secrets; JWTs only warn unless --strict

Suppress a known-safe line with the marker:  filesuite:allow-secret
"""
from __future__ import annotations

import json
import re
import sys
from typing import NamedTuple

ALLOW_MARKER = "filesuite:allow-secret"


class Rule(NamedTuple):
    id: str
    regex: "re.Pattern[str]"
    hard: bool  # hard = deny; soft = ask


RULES = [
    Rule("private-key", re.compile(r"-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED |PGP )?PRIVATE KEY(?: BLOCK)?-----"), True),
    Rule("aws-access-key-id", re.compile(r"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b"), True),
    Rule("github-token", re.compile(r"\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{60,})\b"), True),
    Rule("anthropic-api-key", re.compile(r"\bsk-ant-[A-Za-z0-9_-]{20,}"), True),
    Rule("openai-api-key", re.compile(r"\bsk-(?:proj-|svcacct-|admin-)?[A-Za-z0-9_-]{32,}"), True),
    Rule("slack-token", re.compile(r"\bxox[abprs]-[A-Za-z0-9-]{10,}"), True),
    Rule("stripe-live-key", re.compile(r"\b[rs]k_live_[A-Za-z0-9]{20,}"), True),
    Rule("google-api-key", re.compile(r"\bAIza[0-9A-Za-z_-]{35}\b"), True),
    Rule("connection-string-password", re.compile(r"\b[a-z][a-z0-9+.-]*://[^\s:/@]+:[^\s@/]{6,}@[^\s/]+"), True),
    Rule("jwt", re.compile(r"\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}"), False),
]
PLACEHOLDER_HINTS = ("example", "placeholder", "your_", "<", "xxxx", "changeme", "dummy")


class Finding(NamedTuple):
    rule: str
    hard: bool
    line: int
    preview: str


def redact(value: str) -> str:
    return value[:6] + "..." + f"({len(value)} chars)"


def scan(text: str) -> list[Finding]:
    findings: list[Finding] = []
    for lineno, line in enumerate(text.splitlines(), 1):
        if ALLOW_MARKER in line:
            continue
        for rule in RULES:
            for match in rule.regex.finditer(line):
                value = match.group(0)
                if rule.id == "connection-string-password" and any(h in value.lower() for h in PLACEHOLDER_HINTS):
                    continue
                findings.append(Finding(rule.id, rule.hard, lineno, redact(value)))
    return findings


def texts_from_tool_input(tool_name: str, tool_input: dict) -> list[str]:
    if tool_name == "Write":
        return [tool_input.get("content", "")]
    if tool_name == "Edit":
        return [tool_input.get("new_string", "")]
    if tool_name == "MultiEdit":
        return [e.get("new_string", "") for e in tool_input.get("edits", [])]
    if tool_name == "NotebookEdit":
        return [tool_input.get("new_source", "")]
    return []


def claude_hook() -> int:
    try:
        event = json.load(sys.stdin)
    except json.JSONDecodeError:
        return 0  # never break the session on malformed input
    tool_input = event.get("tool_input") or {}
    findings = [f for t in texts_from_tool_input(event.get("tool_name", ""), tool_input) for f in scan(t)]
    if not findings:
        return 0
    hard = any(f.hard for f in findings)
    summary = "; ".join(f"{f.rule} at line {f.line} ({f.preview})" for f in findings[:5])
    path = tool_input.get("file_path") or tool_input.get("notebook_path") or "file"
    reason = (
        f"filesuite guard_secrets: possible secret in {path}: {summary}. "
        + ("Load it from an environment variable or secret manager instead of writing it to disk. "
           if hard else "Confirm this token is a non-sensitive fixture. ")
        + f"If it is a deliberate fake, add the comment marker '{ALLOW_MARKER}' on that line."
    )
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny" if hard else "ask",
            "permissionDecisionReason": reason,
        }
    }))
    return 0


def scan_files(paths: list[str], strict: bool = False) -> int:
    """Hard findings always fail. Soft findings (JWTs) warn, and fail only with --strict."""
    failed = False
    for path in paths:
        try:
            with open(path, "rb") as fh:
                data = fh.read()
        except OSError as exc:
            print(f"{path}: cannot read ({exc})", file=sys.stderr)
            continue
        if b"\x00" in data[:8192]:
            continue  # binary
        for f in scan(data.decode("utf-8", errors="ignore")):
            blocking = f.hard or strict
            failed = failed or blocking
            label = "secret" if f.hard else ("jwt" if strict else "jwt, warning")
            print(f"{path}:{f.line}: [{label}] {f.rule} {f.preview}")
    if failed:
        print(f"\nRemove the secret, or add '{ALLOW_MARKER}' on a line holding a deliberate fake.", file=sys.stderr)
    return 1 if failed else 0


def main(argv: list[str]) -> int:
    if argv[:1] == ["--claude-hook"]:
        return claude_hook()
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__)
        return 0
    strict = "--strict" in argv
    return scan_files([a for a in argv if a != "--strict"], strict)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
