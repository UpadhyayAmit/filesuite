export const PRIVACY_GUARANTEES = [
  'Local tool files never leave this browser.',
  'There is no server-side file processing.',
  'There is no tool-content database.',
  'Local tools do not store file content in browser storage.',
  'Accounts are optional and separate from local processing.',
] as const;

export const TOOL_CONTENT_STORAGE_FORBIDDEN_APIS = ['document.cookie', 'localStorage', 'sessionStorage', 'indexedDB'] as const;

export type ProcessingEngine = 'typescript' | 'wasm' | 'worker' | 'wasm-worker' | 'iframe';

export type ModulePrivacySpec = {
  module: string;
  engine: ProcessingEngine;
  maxInputBytes: number;
  notes: string;
};
