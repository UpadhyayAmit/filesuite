# File Suite → AI developer tooling: investigation & plan

Status: proposal + working proof of concept (`plugins/filesuite-devtools`). Date: 2026-11.

## 1. The question, restated

File Suite has ~40 browser tools (JSON, JWT, diff, schema, token estimator, cURL, OpenAPI, …).
In an agent-driven workflow, developers increasingly don't open a website to format JSON — their
coding agent does it. Goal: make File Suite's tools usable **inside** agents and dev pipelines,
with a "copy one line → it works locally" experience, and showcase that on the site.

## 2. Terminology — four different things people call "skill" or "hook"

| Surface | What it is | Who runs it | Portable across agents? | Good for |
|---|---|---|---|---|
| **Agent Skill** (`SKILL.md` + `scripts/`) | Instructions + bundled scripts the agent loads on demand | The model decides when | Yes — open standard (agentskills.io), read by Claude Code, Codex CLI, Cursor, Gemini CLI, Copilot and others | Teaching an agent *how* to do a task well with a deterministic script |
| **Claude Code hook** (`hooks.json`) | Shell command fired on lifecycle events (PreToolUse, PostToolUse, Stop, …) | The harness, deterministically | No — per-agent config format | Guardrails: block secrets, validate files after edits, enforce policy |
| **git hook / pre-commit** (`.pre-commit-hooks.yaml`) | Script run on `git commit` / CI | git / pre-commit framework | Yes — agent-agnostic | Same guardrails, for humans *and* agents, enforced at commit |
| **MCP server** | Process exposing typed tools over Model Context Protocol | Any MCP client | Yes — Claude, ChatGPT, Cursor, VS Code, … | Exposing many tools with typed I/O; non-coding clients (Claude Desktop) |

A **plain Python CLI** underlies all four. Build the logic once as a stdlib script; every surface is a thin wrapper.

## 3. Assessment: which current tools matter for AI work

| Tier | Tools | Why | Agent surface |
|---|---|---|---|
| **A — high value** | LLM token estimator, JSON Schema generator, prompt diff, JWT decoder, OpenAPI validator, cURL converter | Directly used when building LLM apps / tool schemas / debugging APIs; agents do these badly by "eyeballing" | Skill + CLI (+ MCP later) |
| **A — guardrails** | (new) secret scan, JSON/YAML/TOML validation, cert decoder | Agents write config and occasionally paste secrets; deterministic checks are the fix | Claude Code hook + pre-commit |
| **B — useful** | JSON diff, text diff, cron parser, regex tester, YAML⇄JSON, CSV⇄JSON, XML formatter, timestamp | Agents can mostly do these inline; a script mainly adds correctness on large inputs | CLI only; skill if a clear failure mode exists |
| **C — low** | Base64, URL encode, UUID, hash, password gen, image/PDF/ZIP | Trivial for agents or not AI-related | Keep on website only |

Rule of thumb for promoting a tool to a skill: **does the agent get it wrong, slowly, or expensively without a script?**
(Counting tokens across 300 files, merging 50 JSON samples into a schema, auditing JWT claims — yes. Base64 — no.)

## 4. Distribution options

**Direct answer: GitHub Packages does not host Python packages.** It supports npm, Maven/Gradle, NuGet, RubyGems and containers (GHCR) only. There is no `pypi.pkg.github.com`. So "deploy a skill on GitHub Packages" is not the right channel.

| Channel | Install UX for the user | Versioning | Works for | Effort | Verdict |
|---|---|---|---|---|---|
| **This repo as a Claude Code plugin marketplace** | `/plugin marketplace add UpadhyayAmit/filesuite` then `/plugin install filesuite-devtools@filesuite` | git tags / `version` in plugin.json | Skills + hooks + (later) MCP in one install | Done (PoC) | **Primary for Claude Code users** |
| **skills.sh / cross-agent skill installers** | One command, symlinks into each agent's skills dir | git | Skills for Codex, Cursor, Gemini CLI, Copilot… | Low — same `SKILL.md` folders | **Do it**; listing = free discovery |
| **Copy the folder** | `cp -r skills/jwt-inspector ~/.claude/skills/` | none | Any skills-aware agent | Zero | Document as fallback |
| **pre-commit hooks from this repo** | Add 4 lines to `.pre-commit-config.yaml` | git tags | Any git repo, any agent, CI | Done (PoC) | **Primary for guardrails** |
| **PyPI package `filesuite`** (name currently free) | `uvx filesuite jwt <token>` / `pipx install filesuite` | semver | CLI users, CI, MCP server, Windows | Medium (packaging, release workflow, trusted publishing) | **Phase 2** — fixes Windows `python3` and gives one versioned core |
| **MCP server** (`uvx filesuite mcp`) | One JSON entry in the client config, or bundled in the plugin | via PyPI | All MCP clients incl. Claude Desktop / ChatGPT | Medium | **Phase 3** |
| **Single-file scripts (PEP 723)** | `uv run https://raw.githubusercontent.com/.../jwt_inspect.py <token>` | URL pin by tag | "Copy and feel the magic" demos | Done — scripts already carry PEP 723 headers | **Use on the website** |
| GitHub Releases zip | Download zip | tags | Air-gapped teams | Low | Optional, automate later |
| GHCR container | `docker run ghcr.io/...` | tags | CI only | Medium | Skip — overkill for stdlib scripts |
| npm on GitHub Packages | `npx` | semver | Node users | Medium, needs auth for GH Packages | Skip — PyPI or npmjs.com is strictly better |

## 5. Recommended architecture

```
plugins/filesuite-devtools/            <- one plugin, installable from this repo (marketplace)
  .claude-plugin/plugin.json
  skills/<name>/SKILL.md               <- when/how the agent should use it
  skills/<name>/scripts/<name>.py      <- stdlib-only, PEP 723 header, also a standalone CLI
  hooks/hooks.json                     <- Claude Code wiring
  hooks/scripts/*.py                   <- dual-mode: --claude-hook (stdin JSON) | file args (pre-commit)
  tests/                               <- stdlib unittest, runs on 3.9+
.claude-plugin/marketplace.json        <- makes the repo a marketplace
.pre-commit-hooks.yaml                 <- makes the repo a pre-commit hook source
```

Design rules (all applied in the PoC):

1. **Stdlib only, Python ≥ 3.9.** No `pip install` step = the "copy and run" promise holds. Optional accelerators (e.g. `tiktoken`) are used only if already present.
2. **Every script is a CLI first.** Skills and hooks are thin wrappers, so the same file works in a terminal, CI, pre-commit, and agents.
3. **Deterministic exit codes** (`0` ok, `1` findings, `2` bad input) so scripts compose in CI.
4. **Local-only, matching the site's privacy promise.** No network calls; secrets are redacted in output.
5. **Hooks fail open on malformed input.** A broken hook must never brick a session.

### Proof of concept (in this branch)

| Item | Type | Demonstrated |
|---|---|---|
| `jwt-inspector` | Skill + CLI | Decode, HS* verification, 10 audit rules (alg=none, no exp, long-lived, sensitive claims, jku/x5u…) |
| `json-schema-infer` | Skill + CLI | Multi-sample / JSONL merge, `required` = intersection, unions, `--strict` mode for LLM tool schemas |
| `context-budget` | Skill + CLI | Token estimate per file, honours `.gitignore`, window fit + "drop to fit", RAG chunk plan |
| `guard_secrets` | Claude Code PreToolUse hook + pre-commit | Deny on keys/tokens/PEM/credentialed URLs; *ask* on JWTs; redacted reasons; allow-marker |
| `validate_structured` | Claude Code PostToolUse hook + pre-commit | Broken JSON/JSONL/TOML is fed back to the agent, which fixes it in the same turn |

Verified during the investigation:
- Unit tests pass on Python 3.9, 3.10, 3.13 and 3.14 (Linux and Windows).
- `claude plugin validate` passes for marketplace and plugin.
- Live Claude Code run with `--plugin-dir`: secret write **blocked** (file never created); invalid JSON write → hook feedback → agent **auto-fixed** it; all 3 skills discovered and `json-schema-infer` auto-selected for a JSONL task.
- `pre-commit try-repo` on a sample repo: both hooks fail on a planted AWS key and a trailing-comma JSON.

## 6. Showcasing it on filesuite.dev

| Idea | Effort | Impact |
|---|---|---|
| **"Use in your agent" panel on each Tier-A tool page**: three tabs — *Claude Code* (`/plugin install …`), *Any agent* (copy skill folder), *Terminal* (`uv run <raw-url> …`) with a copy button. Driven by a new optional `agent` field on `ToolDefinition` in `components/tool-data.ts`. | S | High — turns every tool page into a distribution point |
| **`/agents` landing page**: before/after recording of the hook blocking a secret and auto-fixing JSON. | S | High — the "magic" moment |
| **`/llms.txt`** listing tools + install lines, so agents browsing the site find the plugin. | XS | Medium |
| **"Agent-ready" badge** on tool cards that have a skill. | XS | Medium |
| Skill page per tool generated from `SKILL.md` (single source of truth for docs). | M | Medium |
| Track adoption without breaking privacy: GitHub stars/clones, PyPI downloads, marketplace installs — **no telemetry in scripts**. | XS | Needed to know if this works |

## 7. Roadmap

| Phase | Scope | Exit criteria |
|---|---|---|
| **0 — this branch** | PoC plugin (3 skills, 2 hooks), marketplace, pre-commit, tests, CI | Merged; install line works from GitHub |
| **1 — Tier-A coverage** (1–2 wks) | Skills: `prompt-diff`, `openapi-lint`, `curl-convert`; hook: YAML validation (needs PyYAML → optional); "Use in your agent" panel + `/agents` page | 6 skills; panel live on 6 tool pages |
| **2 — Python package** (1 wk) | `pyproject.toml`, `filesuite` on PyPI via trusted publishing, `uvx filesuite <tool>`; switch pre-commit to `language: python` (fixes Windows); tag-driven releases | `uvx filesuite --help` works on Win/macOS/Linux |
| **3 — MCP server** (1 wk) | `filesuite mcp` (stdio) exposing Tier-A tools with JSON-Schema'd inputs; bundle in plugin via `.mcp.json`; list in MCP registry | Works in Claude Desktop + one non-Claude client |
| **4 — Team policy pack** | Configurable rules file (`.filesuite.toml`), SARIF output for GitHub code scanning, `Stop` hook that runs checks before the agent ends a turn | One external team using it in CI |

## 8. Risks, constraints, open questions

| # | Risk / constraint | Severity | Mitigation |
|---|---|---|---|
| 1 | **No LICENSE file in the repo.** Public skills/plugins without a license are legally "all rights reserved"; teams can't adopt them, and the plugin directory flags it. | **Blocker for public distribution** | Pick a license (MIT/Apache-2.0 for the plugin at least; can differ from the site). |
| 2 | Logic duplicated between TS (browser) and Python (agent) → drift. | Medium | Shared golden fixtures (`fixtures/<tool>/*.json` input→expected output) run by both test suites. |
| 3 | Windows: hooks call `python3`, which often doesn't exist (only `python`/`py`). | Medium | Phase 2: PyPI entry points (`uvx filesuite …`) remove the interpreter-name problem. Until then, document it. |
| 4 | Regex secret detection has false negatives/positives. | Medium | Position it as a fast first line, not a replacement for gitleaks/trufflehog/GitHub push protection. Allow-marker for fixtures. |
| 5 | Skill trust: users are told (correctly) to read third-party skills before installing. | Medium | Stdlib-only, no network, short scripts, tests + CI visible — make auditing trivial. |
| 6 | Skill triggering depends on `description` quality. | Medium | Keep "Use when …" phrasing with concrete triggers; evaluate before each release. |
| 7 | Token counts are heuristic (±20%), not the Claude tokenizer. | Low | Labelled everywhere; the API's token-counting endpoint is the exact path (opt-in, online — keep out of the local tool). |
| 8 | Repo hygiene: `public/pyodide/*` (incl. `.wasm`, `python_stdlib.zip`) is **committed despite `.gitignore`**; `context-budget` surfaced it. | Low (separate) | `git rm -r --cached public/pyodide public/wasm` in a separate PR, since `postinstall` regenerates them. |
| 9 | Agent ecosystems move fast (hook event names, plugin schema). | Low | `claude plugin validate` in CI; small surface. |

Open questions for the owner:
- License choice (blocks Phase 0 announcement).
- Is the website's audience mostly Claude Code users, or mixed? Determines whether Phase 3 (MCP) moves ahead of Phase 2.
- Appetite for an *online* opt-in mode (e.g. exact token counts via API) — conflicts with the local-only positioning; recommend not in core.
