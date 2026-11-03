#!/usr/bin/env python3
# /// script
# requires-python = ">=3.9"
# dependencies = []
# ///
"""Estimate LLM token cost of files/directories and plan RAG chunking. Stdlib only.

Answers: "Will this fit in the context window?", "Which files eat the budget?",
"How many chunks / embeddings will this corpus produce?"

Usage:
  python3 context_budget.py src/                       # per-file table, largest first
  python3 context_budget.py . --budget 200000          # fit check against a window
  python3 context_budget.py docs/ --chunk 800 --overlap 100   # RAG chunk plan
  python3 context_budget.py . --json --top 0           # full machine-readable output

Inside a git repo, .gitignore is honoured (git ls-files); use --no-git to walk everything.

Token counts are a heuristic (~4 chars/token for English/code, CJK counted per char).
Expect +/-20% vs a real tokenizer. If `tiktoken` happens to be installed it is used
(cl100k_base) as a closer proxy; it is still not the Claude tokenizer.
"""
from __future__ import annotations

import argparse
import fnmatch
import json
import math
import os
import subprocess
import sys
from typing import Callable

DEFAULT_IGNORES = [
    ".git", "node_modules", ".next", "dist", "build", "out", "__pycache__", ".venv", "venv",
    "*.lock", "package-lock.json", "*.min.js", "*.min.mjs", "*.min.css", "*.map", "*.wasm", "*.png", "*.jpg", "*.jpeg",
    "*.gif", "*.webp", "*.ico", "*.pdf", "*.zip", "*.gz", "*.woff", "*.woff2", "*.ttf",
]
MAX_FILE_BYTES = 5 * 1024 * 1024


def heuristic_tokens(text: str) -> int:
    cjk = sum(1 for ch in text if "぀" <= ch <= "鿿" or "가" <= ch <= "힯")
    return math.ceil((len(text) - cjk) / 4) + cjk


def pick_counter() -> tuple[Callable[[str], int], str]:
    try:
        import tiktoken  # type: ignore

        enc = tiktoken.get_encoding("cl100k_base")
        return (lambda s: len(enc.encode(s, disallowed_special=()))), "tiktoken:cl100k_base"
    except Exception:  # noqa: BLE001 - any import/runtime failure falls back
        return heuristic_tokens, "heuristic:chars/4"


def ignored(name: str, patterns: list[str]) -> bool:
    return any(fnmatch.fnmatch(name, p) for p in patterns)


def git_files(root_path: str) -> list[str] | None:
    """Tracked + untracked-but-not-ignored files under root_path, or None outside a git repo."""
    try:
        proc = subprocess.run(
            ["git", "-C", root_path, "ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", "."],
            capture_output=True, check=True, timeout=30,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    return [os.path.join(root_path, p) for p in proc.stdout.decode("utf-8", "replace").split("\0") if p]


def iter_files(paths: list[str], patterns: list[str], use_git: bool = True):
    for root_path in paths:
        if os.path.isfile(root_path):
            yield root_path
            continue
        listed = git_files(root_path) if use_git else None
        if listed is not None:
            for path in sorted(listed):
                parts = os.path.normpath(os.path.relpath(path, root_path)).split(os.sep)
                if os.path.isfile(path) and not any(ignored(p, patterns) for p in parts):
                    yield path
            continue
        for dirpath, dirnames, filenames in os.walk(root_path):
            dirnames[:] = sorted(d for d in dirnames if not ignored(d, patterns))
            for name in sorted(filenames):
                if not ignored(name, patterns):
                    yield os.path.join(dirpath, name)


def read_text(path: str) -> str | None:
    try:
        if os.path.getsize(path) > MAX_FILE_BYTES:
            return None
        with open(path, "rb") as fh:
            data = fh.read()
    except OSError:
        return None
    if b"\x00" in data[:8192]:
        return None  # binary
    return data.decode("utf-8", errors="replace")


def chunk_count(tokens: int, size: int, overlap: int) -> int:
    if tokens <= 0:
        return 0
    if tokens <= size:
        return 1
    return 1 + math.ceil((tokens - size) / (size - overlap))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("paths", nargs="*", default=["."])
    parser.add_argument("--budget", type=int, help="context window in tokens to check against")
    parser.add_argument("--reserve", type=int, default=0, help="tokens reserved for system prompt + output")
    parser.add_argument("--chunk", type=int, help="RAG chunk size in tokens")
    parser.add_argument("--overlap", type=int, default=0, help="RAG chunk overlap in tokens")
    parser.add_argument("--ignore", action="append", default=[], help="extra glob to skip (repeatable)")
    parser.add_argument("--top", type=int, default=15, help="rows to show (0 = all)")
    parser.add_argument("--no-git", action="store_true", help="walk the filesystem instead of honouring .gitignore")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args(argv)

    if args.chunk is not None and not 0 <= args.overlap < args.chunk:
        print("error: need 0 <= --overlap < --chunk", file=sys.stderr)
        return 2

    count, method = pick_counter()
    patterns = DEFAULT_IGNORES + args.ignore
    rows, skipped = [], 0
    for path in iter_files(args.paths, patterns, not args.no_git):
        text = read_text(path)
        if text is None:
            skipped += 1
            continue
        rows.append({"path": path, "tokens": count(text), "bytes": len(text.encode("utf-8"))})
    rows.sort(key=lambda r: r["tokens"], reverse=True)
    total = sum(r["tokens"] for r in rows)

    result: dict = {"method": method, "files": len(rows), "skipped_binary_or_large": skipped, "total_tokens": total}
    if args.budget:
        usable = args.budget - args.reserve
        result["budget"] = {"window": args.budget, "reserve": args.reserve, "usable": usable,
                            "fits": total <= usable, "utilization_pct": round(100 * total / usable, 1) if usable > 0 else None}
        if total > usable:
            # Greedy: smallest set of largest files to drop so the rest fits.
            over, drop = total - usable, []
            for r in rows:
                if over <= 0:
                    break
                drop.append(r["path"])
                over -= r["tokens"]
            result["budget"]["drop_to_fit"] = drop
    if args.chunk:
        chunks = sum(chunk_count(r["tokens"], args.chunk, args.overlap) for r in rows)
        result["chunking"] = {"chunk_size": args.chunk, "overlap": args.overlap, "chunks": chunks,
                              "embedded_tokens": chunks * args.chunk if chunks else 0,
                              "overlap_overhead_pct": round(100 * (args.overlap / args.chunk), 1)}
    shown = rows if args.top == 0 else rows[: args.top]
    result["largest"] = shown

    if args.json:
        print(json.dumps(result, indent=2))
        return 0 if result.get("budget", {}).get("fits", True) else 1

    width = max((len(r["path"]) for r in shown), default=10)
    print(f"{'tokens':>10}  {'%':>5}  path")
    for r in shown:
        pct = 100 * r["tokens"] / total if total else 0
        print(f"{r['tokens']:>10,}  {pct:>5.1f}  {r['path']:<{width}}")
    print(f"\nTotal: {total:,} tokens across {len(rows)} files ({method}); skipped {skipped} binary/large")
    if "budget" in result:
        b = result["budget"]
        verdict = "FITS" if b["fits"] else "DOES NOT FIT"
        print(f"Budget: {verdict} - {total:,} / {b['usable']:,} usable ({b['utilization_pct']}%)")
        if not b["fits"]:
            print("Drop to fit: " + ", ".join(b["drop_to_fit"]))
    if "chunking" in result:
        c = result["chunking"]
        print(f"Chunking: {c['chunks']:,} chunks of {c['chunk_size']} (overlap {c['overlap']}) ~ {c['embedded_tokens']:,} embedded tokens")
    return 0 if result.get("budget", {}).get("fits", True) else 1


if __name__ == "__main__":
    sys.exit(main())
