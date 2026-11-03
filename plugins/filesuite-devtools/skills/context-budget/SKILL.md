---
name: context-budget
description: Estimate how many LLM tokens a set of files or a directory costs, check it against a context window, list which files dominate, and plan RAG chunk counts. Use before loading a large codebase or document set into a prompt, when sizing a RAG/embedding job, or when the user asks "will this fit in context" or "how many tokens is this repo".
---

# Context Budget

Measure first, then decide what to load. Reading files blindly to "see how big they are" wastes
the context you are trying to protect — run this script instead.

## Run

The script is `scripts/context_budget.py` next to this file.

```bash
python3 <skill-dir>/scripts/context_budget.py <path>...                    # largest files first
python3 <skill-dir>/scripts/context_budget.py . --budget 200000 --reserve 20000
python3 <skill-dir>/scripts/context_budget.py docs/ --chunk 800 --overlap 100
python3 <skill-dir>/scripts/context_budget.py . --ignore "*.test.ts" --json --top 0
```

Exit code `1` with `--budget` means it does not fit; the output lists the largest files to drop.

## Interpreting

- Counts are an estimate (±20%). Say "≈" when reporting and keep a 20% safety margin.
- `--reserve` = system prompt + tool definitions + expected output. Default to ≥10% of the window.
- For chunking, overlap above ~20% of chunk size usually buys little recall for the extra cost.

## Recommend, don't just report

If it does not fit, propose a concrete loading plan: which directories to summarise, which files to
read in full, and which to skip (generated code, fixtures, lockfiles).
