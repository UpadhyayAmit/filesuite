import { Cpu, DatabaseZap, HardDriveDownload } from 'lucide-react';
import type { ModulePrivacySpec } from '@/lib/privacy';
import { formatBytes } from '@/lib/file-limits';

type ToolNoticeProps = {
  spec: ModulePrivacySpec;
};

export function ToolNotice({ spec }: ToolNoticeProps) {
  const chips = [
    {
      icon: Cpu,
      label: engineLabel(spec.engine),
      className: 'bg-[#eef4ff] text-blue-700',
    },
    {
      icon: DatabaseZap,
      label: 'Runs in browser',
      className: 'bg-[#eafaf3] text-emerald-700',
    },
    {
      icon: HardDriveDownload,
      label: `Max ${formatBytes(spec.maxInputBytes)}`,
      className: 'bg-[#fff3e8] text-coral',
    },
  ];

  return (
    <div className="flex flex-wrap gap-2 rounded-xl border border-line bg-white/80 p-2 shadow-sm" aria-label={spec.notes}>
      {chips.map((chip) => {
        const Icon = chip.icon;

        return (
          <span key={chip.label} className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-semibold ${chip.className}`}>
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {chip.label}
          </span>
        );
      })}
    </div>
  );
}

function engineLabel(engine: ModulePrivacySpec['engine']) {
  switch (engine) {
    case 'wasm-worker':
      return 'WASM worker';
    case 'wasm':
      return 'WASM';
    case 'worker':
      return 'Web Worker';
    case 'iframe':
      return 'Sandbox iframe';
    case 'typescript':
    default:
      return 'TypeScript';
  }
}
