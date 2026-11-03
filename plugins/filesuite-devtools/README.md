# filesuite-devtools

File Suite's developer tools for coding agents. Everything runs locally on Python 3.9+ with only the standard library: no install step, no network calls.

| Name | Kind | What it does |
|---|---|---|
| `jwt-inspector` | Skill + CLI | Decodes a JWT, verifies HS* signatures and flags issues like alg=none, a missing or long `exp`, or sensitive claims |
| `json-schema-infer` | Skill + CLI | Builds a JSON Schema from many JSON/JSONL samples, with a strict mode for LLM tool schemas |
| `context-budget` | Skill + CLI | Estimates tokens per file, checks the total against a context window and plans RAG chunks |
| `guard_secrets` | Claude Code hook + pre-commit | Blocks private keys and API/cloud tokens before they are written or committed |
| `validate_structured` | Claude Code hook + pre-commit | Sends a broken JSON/JSONL/TOML file back to the agent so it fixes it right away |

## Install

**Claude Code** (installs the skills and hooks together):

```text
/plugin marketplace add UpadhyayAmit/filesuite
/plugin install filesuite-devtools@filesuite
```

**Other agents that read skills** (Codex CLI, Cursor, Gemini CLI, Copilot, and others): copy a skill folder into the agent's skills directory, for example:

```bash
cp -r plugins/filesuite-devtools/skills/jwt-inspector ~/.claude/skills/
```

**Plain terminal**: every script is a standalone CLI.

```bash
python3 skills/jwt-inspector/scripts/jwt_inspect.py "$TOKEN"
python3 skills/json-schema-infer/scripts/infer_schema.py samples/*.json --strict
python3 skills/context-budget/scripts/context_budget.py . --budget 200000
# or, with uv, straight from GitHub (pin a tag in real use):
uv run https://raw.githubusercontent.com/UpadhyayAmit/filesuite/main/plugins/filesuite-devtools/skills/context-budget/scripts/context_budget.py .
```

**git pre-commit** (works whether a person or an agent wrote the code):

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/UpadhyayAmit/filesuite
    rev: main   # pin a tag once one is released
    hooks:
      - id: filesuite-guard-secrets
      - id: filesuite-validate-structured
```

## Behaviour

- `guard_secrets`
  - A hard secret (key, token or credentialed URL) is **denied** before the write happens.
  - A JWT gets **ask**, so the user confirms it.
  - In pre-commit, a JWT only produces a warning unless you pass `--strict`.
  - To allow a deliberate fake, put `filesuite:allow-secret` on the same line.
- `validate_structured` skips JSON-with-comments files (`tsconfig*.json`, `.vscode/*`, `*.jsonc`). It checks TOML only on Python 3.11+.
- Exit codes are the same for every script:
  - `0` means no problems.
  - `1` means it found problems.
  - `2` means the input was invalid.

## Known limits

- The hooks call `python3`. On Windows, where usually only `python` or `py` exists, edit `hooks/hooks.json` or wait for the PyPI package (see `docs/ai/STRATEGY.md`).
- Secret detection uses regexes. It is a fast first check and does not replace gitleaks, trufflehog or GitHub push protection.
- Token counts are a ±20% heuristic. They are not exact for any specific model.

## Develop

```bash
python3 -m unittest discover -s plugins/filesuite-devtools/tests -v
claude plugin validate .                              # marketplace
claude plugin validate plugins/filesuite-devtools     # plugin
claude --plugin-dir plugins/filesuite-devtools        # try it locally
```
