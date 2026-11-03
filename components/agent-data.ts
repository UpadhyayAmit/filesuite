/**
 * Agent integrations shipped in plugins/filesuite-devtools.
 * Only list tools that have a real skill or hook in the repo — the website must not promise
 * integrations that do not exist yet.
 */

export const REPO_SLUG = 'UpadhyayAmit/filesuite';
export const REPO_URL = `https://github.com/${REPO_SLUG}`;
export const PLUGIN_NAME = 'filesuite-devtools';
export const PLUGIN_PATH = 'plugins/filesuite-devtools';
const RAW_BASE = `https://raw.githubusercontent.com/${REPO_SLUG}/main/${PLUGIN_PATH}`;

export const CLAUDE_INSTALL = `/plugin marketplace add ${REPO_SLUG}\n/plugin install ${PLUGIN_NAME}@filesuite`;

export const PRE_COMMIT_CONFIG = `# .pre-commit-config.yaml
repos:
  - repo: ${REPO_URL}
    rev: main   # pin a release tag in real use
    hooks:
      - id: filesuite-guard-secrets
      - id: filesuite-validate-structured`;

export type AgentIntegrationKind = 'skill' | 'hook';

export type AgentIntegration = {
  kind: AgentIntegrationKind;
  /** Skill folder name or hook script name. */
  name: string;
  title: string;
  summary: string;
  /** What the agent can do that it cannot do reliably without the script. */
  benefits: string[];
  /** Folder to copy for agents that read SKILL.md (skills only). */
  skillDir?: string;
  /** Standalone terminal command (Python 3.9+, stdlib only). */
  terminal: string;
};

function skillCopy(dir: string) {
  return `git clone --depth 1 ${REPO_URL}.git filesuite-src\ncp -r filesuite-src/${PLUGIN_PATH}/skills/${dir} ~/.claude/skills/`;
}

export function copyCommand(integration: AgentIntegration) {
  return integration.skillDir ? skillCopy(integration.skillDir) : PRE_COMMIT_CONFIG;
}

/** Keyed by ToolDefinition.id */
export const AGENT_INTEGRATIONS: Record<string, AgentIntegration> = {
  'jwt-decoder': {
    kind: 'skill',
    name: 'jwt-inspector',
    title: 'JWT Inspector skill',
    summary: 'Your agent decodes and security-audits tokens locally instead of pasting them into a website.',
    benefits: [
      'Flags alg=none, missing or long-lived exp, and sensitive claims',
      'Verifies HS256/384/512 signatures with your secret',
      'Exit code 1 on high-severity findings, so it works in CI',
    ],
    skillDir: 'jwt-inspector',
    terminal: `uv run ${RAW_BASE}/skills/jwt-inspector/scripts/jwt_inspect.py "$TOKEN"`,
  },
  'json-schema-generator': {
    kind: 'skill',
    name: 'json-schema-infer',
    title: 'JSON Schema Infer skill',
    summary: 'Merge many JSON or JSONL samples into one schema, ready for LLM tool calling and structured output.',
    benefits: [
      'required = fields present in every sample; differing types become unions',
      '--strict produces schemas for strict tool / structured-output modes',
      '--no-examples keeps real customer data out of the schema',
    ],
    skillDir: 'json-schema-infer',
    terminal: `uv run ${RAW_BASE}/skills/json-schema-infer/scripts/infer_schema.py samples/*.json --strict`,
  },
  'token-estimator': {
    kind: 'skill',
    name: 'context-budget',
    title: 'Context Budget skill',
    summary: 'Measure a codebase or document set before loading it into a prompt or a RAG pipeline.',
    benefits: [
      'Per-file token table that honours .gitignore',
      'Fit check against a context window, with the files to drop',
      'RAG chunk-count plan for a given chunk size and overlap',
    ],
    skillDir: 'context-budget',
    terminal: `uv run ${RAW_BASE}/skills/context-budget/scripts/context_budget.py . --budget 200000`,
  },
  'json-format': {
    kind: 'hook',
    name: 'validate_structured',
    title: 'JSON / TOML validation hook',
    summary: 'Every time an agent edits a JSON, JSONL or TOML file, it is re-parsed; a syntax error goes straight back to the agent to fix.',
    benefits: [
      'Claude Code PostToolUse hook: broken config never survives the turn',
      'Same script runs as a git pre-commit hook for humans and CI',
      'Skips JSON-with-comments files such as tsconfig.json',
    ],
    terminal: `uv run ${RAW_BASE}/hooks/scripts/validate_structured.py package.json config/*.toml`,
  },
};

/** Hooks that are not tied to a single website tool. */
export const STANDALONE_HOOKS: AgentIntegration[] = [
  {
    kind: 'hook',
    name: 'guard_secrets',
    title: 'Secret guard hook',
    summary: 'Blocks private keys, cloud and API tokens and credentialed URLs before an agent writes them to disk or you commit them.',
    benefits: [
      'Hard secrets are denied; JWTs ask you first',
      'Reasons are redacted, so the secret is not echoed back',
      'Add filesuite:allow-secret on a line to allow a deliberate fake',
    ],
    terminal: `uv run ${RAW_BASE}/hooks/scripts/guard_secrets.py $(git ls-files)`,
  },
];

export function getAgentIntegration(toolId: string): AgentIntegration | undefined {
  return AGENT_INTEGRATIONS[toolId];
}
