'use client';

import { Copy, Download, FileCheck2, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { DropZone } from './DropZone';
import { Sidebar } from './Sidebar';
import { ToolDashboard } from './ToolDashboard';
import { ToolInfoSections, ToolRightRail } from './ToolPageWidgets';
import { ToolNotice } from './ToolNotice';
import { TOOL_CATEGORIES, findTool, type ToolDefinition } from './tool-data';
import { convertCurl } from '@/modules/api/curl';
import { validateOpenApi } from '@/modules/api/openapi';
import { generateJsonSchema } from '@/modules/ai/json-schema';
import { estimateTokens } from '@/modules/ai/token-estimator';
import { generateIcsEvent, staticIcsDataUrl } from '@/modules/calendar/ics';
import {
  decodeBase64,
  encodeBase64,
  formatXml,
  generateUuid,
  jsonToYaml,
  testRegex,
  urlDecode,
  urlEncode,
  yamlToJson,
} from '@/modules/devtools/converters';
import { explainCron } from '@/modules/devtools/cron';
import { hashText, type HashAlgorithm } from '@/modules/devtools/hash';
import { diffJson, diffTextInput } from '@/modules/devtools/json-diff';
import { formatJson, minifyJson } from '@/modules/devtools/json';
import { formatJwt } from '@/modules/devtools/jwt';
import { convertUnixTimestamp } from '@/modules/devtools/time';
import { csvToJson, jsonToCsv } from '@/modules/filetools/csv';
import { excelToCsv, excelToJson } from '@/modules/filetools/excel';
import { unzipEntries, zipEntries } from '@/modules/filetools/zip';
import { base64ToImage, compressImage, convertImage, imageToBase64, resizeImage } from '@/modules/image/image.client';
import type { ImageOutputFormat } from '@/modules/image/types';
import { convertPdfToEpub } from '@/modules/pdf/epub.client';
import { mergePdfs } from '@/modules/pdf/pdf.client';
import { buildHtmlPreview, runJavaScriptSnippet } from '@/modules/runtime/browser-runner.client';
import { runPythonCode } from '@/modules/runtime/python.client';
import { runSql } from '@/modules/runtime/sql.client';
import { transpileTypeScript } from '@/modules/runtime/typescript.client';
import { inspectWasmModule } from '@/modules/runtime/wasm-runner.client';
import { decodeCertificate, generatePasswords } from '@/modules/security/security-tools';
import { downloadBlob, downloadText } from '@/utils/download';
import { toErrorMessage } from '@/utils/errors';

type WorkspaceProps = {
  initialToolId?: string;
};

export function Workspace({ initialToolId }: WorkspaceProps) {
  const [activeToolId, setActiveToolId] = useState(initialToolId ? findTool(initialToolId).id : '');
  const [files, setFiles] = useState<File[]>([]);
  const [input, setInput] = useState(makeSampleInput(activeToolId));
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [imageFormat, setImageFormat] = useState<ImageOutputFormat>('webp');
  const [resizeWidth, setResizeWidth] = useState(1024);
  const [resizeHeight, setResizeHeight] = useState(768);
  const [hashAlgorithm, setHashAlgorithm] = useState<HashAlgorithm>('SHA-256');
  const [isBusy, setIsBusy] = useState(false);

  const activeTool = useMemo(() => (activeToolId ? findTool(activeToolId) : null), [activeToolId]);

  useEffect(() => {
    setInput(makeSampleInput(activeToolId));
    setOutput('');
    setError('');
    setStatus('');
    setFiles([]);
  }, [activeToolId]);

  function selectTool(toolId: string) {
    setActiveToolId(findTool(toolId).id);
  }

  const displayOutput = output || getPassiveOutput(activeToolId);

  async function runTool(action?: string) {
    if (!activeTool) return;

    setError('');
    setStatus('');
    setIsBusy(true);
    trackToolUse(activeTool, action);

    try {
      if (activeTool.status !== 'live') {
        setStatus(getPlannedMessage(activeTool));
      } else if (activeTool.id === 'pdf-merge') {
        const blob = await mergePdfs(files);
        downloadBlob(blob, 'merged.pdf');
        setStatus('Merged PDF downloaded.');
      } else if (activeTool.id === 'pdf-epub') {
        const file = requireFile(files, 'Choose a PDF first.');
        const blob = await convertPdfToEpub(file);
        downloadBlob(blob, `${file.name.replace(/\.pdf$/i, '') || 'document'}.epub`);
        setStatus('EPUB downloaded.');
      } else if (activeTool.id === 'image-convert') {
        const file = requireFile(files, 'Choose an image first.');
        const blob = await convertImage(file, { format: imageFormat, quality: 82 });
        downloadBlob(blob, `${file.name.replace(/\.[^.]+$/, '')}.${imageFormat === 'jpeg' ? 'jpg' : imageFormat}`);
        setStatus('Converted image downloaded.');
      } else if (activeTool.id === 'image-compress') {
        const file = requireFile(files, 'Choose an image first.');
        const blob = await compressImage(file, 72);
        downloadBlob(blob, `${file.name.replace(/\.[^.]+$/, '')}-compressed.${fileExtensionForMime(blob.type, file.name)}`);
        setStatus('Compressed image downloaded.');
      } else if (activeTool.id === 'image-resize') {
        const file = requireFile(files, 'Choose an image first.');
        const blob = await resizeImage(file, resizeWidth, resizeHeight);
        downloadBlob(blob, `${file.name.replace(/\.[^.]+$/, '')}-${resizeWidth}x${resizeHeight}.${fileExtensionForMime(blob.type, file.name)}`);
        setStatus('Resized image downloaded.');
      } else if (activeTool.id === 'base64-image') {
        if (action === 'decode') {
          const blob = base64ToImage(input.trim());
          downloadBlob(blob, 'decoded-image.png');
          setStatus('Decoded image downloaded.');
        } else {
          const file = requireFile(files, 'Choose an image first.');
          setOutput(await imageToBase64(file));
          setStatus('Base64 data URL generated.');
        }
      } else if (activeTool.id === 'ics-generator') {
        const ics = generateIcsEvent({
          title: 'filesuite.dev event',
          description: input || 'Generated locally in the browser.',
          start: new Date(Date.now() + 60 * 60 * 1000),
          end: new Date(Date.now() + 2 * 60 * 60 * 1000),
        });
        setOutput(ics);
        setStatus('ICS content generated.');
      } else if (activeTool.id === 'json-format') {
        const result = action === 'minify' ? minifyJson(input) : formatJson(input);
        if (!result.ok) throw new Error(result.error);
        setOutput(result.formatted);
        setStatus('JSON is valid.');
      } else if (activeTool.id === 'jwt-decoder') {
        setOutput(formatJwt(input));
        setStatus('JWT decoded locally.');
      } else if (activeTool.id === 'base64') {
        setOutput(action === 'decode' ? decodeBase64(input) : encodeBase64(input));
        setStatus('Base64 result generated.');
      } else if (activeTool.id === 'url-codec') {
        setOutput(action === 'decode' ? urlDecode(input) : urlEncode(input));
        setStatus('URL result generated.');
      } else if (activeTool.id === 'timestamp') {
        setOutput(convertUnixTimestamp(input));
        setStatus('Timestamp converted.');
      } else if (activeTool.id === 'uuid') {
        setOutput(Array.from({ length: 10 }, () => generateUuid()).join('\n'));
        setStatus('UUIDs generated.');
      } else if (activeTool.id === 'hash') {
        setOutput(await hashText(input, hashAlgorithm));
        setStatus(`${hashAlgorithm} hash generated.`);
      } else if (activeTool.id === 'regex-tester') {
        const { pattern, flags, text } = parseRegexInput(input);
        const result = testRegex(pattern, flags, text);
        setOutput(JSON.stringify(result, null, 2));
        setStatus(`${result.count} match${result.count === 1 ? '' : 'es'} found.`);
      } else if (activeTool.id === 'text-diff' || activeTool.id === 'prompt-diff') {
        setOutput(diffTextInput(input));
        setStatus('Diff generated.');
      } else if (activeTool.id === 'json-diff') {
        const [left, right] = splitForTwoPane(input);
        setOutput(diffJson(left, right));
        setStatus('JSON diff generated.');
      } else if (activeTool.id === 'cron-parser') {
        setOutput(explainCron(input));
        setStatus('Cron expression explained.');
      } else if (activeTool.id === 'yaml-json') {
        setOutput(action === 'json-to-yaml' ? jsonToYaml(input) : yamlToJson(input));
        setStatus('Conversion complete.');
      } else if (activeTool.id === 'xml-format') {
        setOutput(formatXml(input));
        setStatus('XML formatted.');
      } else if (activeTool.id === 'csv-json') {
        setOutput(action === 'json-to-csv' ? jsonToCsv(input) : csvToJson(input));
        setStatus('Conversion complete.');
      } else if (activeTool.id === 'excel-csv') {
        const file = requireFile(files, 'Choose an Excel file first.');
        const csv = await excelToCsv(file);
        setOutput(csv);
        downloadText(csv, `${file.name.replace(/\.[^.]+$/, '')}.csv`, 'text/csv;charset=utf-8');
        setStatus('CSV downloaded.');
      } else if (activeTool.id === 'excel-json') {
        const file = requireFile(files, 'Choose an Excel file first.');
        const json = await excelToJson(file);
        setOutput(json);
        downloadText(json, `${file.name.replace(/\.[^.]+$/, '')}.json`, 'application/json;charset=utf-8');
        setStatus('JSON downloaded.');
      } else if (activeTool.id === 'zip-tools') {
        if (files.length === 1 && /\.zip$/i.test(files[0].name)) {
          const entries = unzipEntries(new Uint8Array(await files[0].arrayBuffer()));
          entries.forEach((entry) => downloadBlob(new Blob([toBlobPart(entry.bytes)]), entry.name.split('/').pop() || entry.name));
          setStatus(`${entries.length} ZIP entr${entries.length === 1 ? 'y' : 'ies'} extracted.`);
        } else {
          if (!files.length) throw new Error('Choose files to zip or one .zip file to extract.');
          const entries = await Promise.all(
            files.map(async (file) => ({
              name: file.name,
              bytes: new Uint8Array(await file.arrayBuffer()),
            })),
          );
          const zipped = zipEntries(entries);
          downloadBlob(new Blob([toBlobPart(zipped)], { type: 'application/zip' }), 'filesuite.zip');
          setStatus(`${files.length} file${files.length === 1 ? '' : 's'} compressed into ZIP.`);
        }
      } else if (activeTool.id === 'openapi-validator') {
        setOutput(validateOpenApi(input));
        setStatus('OpenAPI validation complete.');
      } else if (activeTool.id === 'curl-converter') {
        setOutput(convertCurl(input));
        setStatus('cURL command converted.');
      } else if (activeTool.id === 'token-estimator') {
        setOutput(estimateTokens(input));
        setStatus('Token estimate generated locally.');
      } else if (activeTool.id === 'json-schema-generator') {
        setOutput(generateJsonSchema(input));
        setStatus('JSON Schema generated locally.');
      } else if (activeTool.id === 'javascript-compiler') {
        setOutput(await runJavaScriptSnippet(input));
        setStatus('JavaScript finished in an isolated worker.');
      } else if (activeTool.id === 'python-compiler') {
        setOutput(await runPythonCode(input));
        setStatus('Python finished in Pyodide.');
      } else if (activeTool.id === 'typescript-playground') {
        setOutput(transpileTypeScript(input));
        setStatus('TypeScript transpiled locally.');
      } else if (activeTool.id === 'sql-compiler') {
        setOutput(await runSql(input));
        setStatus('SQLite query executed locally.');
      } else if (activeTool.id === 'html-css-js-editor') {
        setOutput(buildHtmlPreview(input));
        setStatus('Preview updated in a sandboxed iframe.');
      } else if (activeTool.id === 'wasm-runner') {
        const file = requireFile(files, 'Choose a .wasm file first.');
        setOutput(await inspectWasmModule(file, input.trim()));
        setStatus('WASM module inspected locally.');
      } else if (activeTool.id === 'rust-wasm-notes') {
        setOutput(getRustWasmNotes());
        setStatus('Rust WASM notes generated.');
      } else if (activeTool.id === 'password-generator') {
        setOutput(generatePasswords());
        setStatus('Passwords generated locally.');
      } else if (activeTool.id === 'certificate-decoder') {
        setOutput(decodeCertificate(input));
        setStatus('Certificate inspected locally.');
      }
    } catch (caught) {
      setError(toErrorMessage(caught));
    } finally {
      setIsBusy(false);
    }
  }

  if (!activeTool) {
    return <ToolDashboard onSelectTool={initialToolId ? selectTool : undefined} />;
  }

  return (
    <main className="grid min-h-[calc(100vh-65px)] bg-[radial-gradient(circle_at_top_left,rgba(255,107,53,0.08),transparent_28%),linear-gradient(180deg,#f8fbff,#f7f8fb)] lg:grid-cols-[300px_minmax(0,1fr)]">
      <Sidebar categories={TOOL_CATEGORIES} activeToolId={activeToolId} onSelectTool={selectTool} onDashboard={() => setActiveToolId('')} />
      <section className="min-w-0 p-4 sm:p-6 lg:p-7">
        <div className="mx-auto grid max-w-[1680px] gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="grid min-w-0 gap-6">
              <ToolHeader tool={activeTool} />
              <section id="tool-workspace" className="grid gap-4 rounded-2xl border border-line bg-white/78 p-4 shadow-[0_24px_80px_rgba(22,34,51,0.08)] backdrop-blur sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <ToolNotice spec={activeTool.spec} />
                  <span className="hidden rounded-full bg-[#eef4ff] px-3 py-1 text-xs font-semibold text-blue-700 sm:inline-flex">
                    Browser workspace
                  </span>
                </div>

                {activeTool.status !== 'live' ? <PlannedToolPanel tool={activeTool} /> : null}

                {(activeTool.accept || activeTool.id === 'base64-image') && activeTool.status === 'live' && (
                  <div className="grid gap-3">
                    <DropZone
                      accept={activeTool.accept}
                      multiple={activeTool.id === 'pdf-merge'}
                      onFiles={(selected) => {
                        setFiles(selected);
                        setStatus(`${selected.length} file${selected.length === 1 ? '' : 's'} selected in memory.`);
                      }}
                    />
                    {files.length > 0 && (
                      <div className="rounded-lg border border-line bg-white p-3 text-sm text-muted">
                        {files.map((file) => file.name).join(', ')}
                      </div>
                    )}
                  </div>
                )}

                <ToolControls
                  activeTool={activeTool}
                  imageFormat={imageFormat}
                  onImageFormat={setImageFormat}
                  resizeWidth={resizeWidth}
                  resizeHeight={resizeHeight}
                  onResizeWidth={setResizeWidth}
                  onResizeHeight={setResizeHeight}
                  hashAlgorithm={hashAlgorithm}
                  onHashAlgorithm={setHashAlgorithm}
                  input={input}
                  output={displayOutput}
                  setInput={setInput}
                  isBusy={isBusy}
                  onRun={runTool}
                />

                {status && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{status}</p>}
                {error && <p className="rounded-xl border border-coral/35 bg-coral/10 px-4 py-3 text-sm font-medium text-ink">{error}</p>}
              </section>
              <ToolInfoSections tool={activeTool} />
          </div>
          <ToolRightRail tool={activeTool} />
        </div>
      </section>
    </main>
  );
}

function trackToolUse(tool: ToolDefinition, action?: string) {
  fetch('/api/tool-usage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug: tool.slug, toolId: tool.id, action: action ?? 'run' }),
    keepalive: true,
  }).catch(() => {
    // Usage counters are best-effort and must never block local tools.
  });
}

function ToolHeader({ tool }: { tool: ToolDefinition }) {
  const Icon = tool.icon;

  return (
    <header className="relative overflow-hidden rounded-2xl border border-line bg-white p-5 shadow-[0_20px_70px_rgba(22,34,51,0.08)] md:p-6">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-coral via-[#3b82f6] to-[#7c3aed]" />
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-coral/15 to-blue-500/15 text-coral ring-1 ring-line">
            <Icon className="h-7 w-7" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">{tool.category}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-ink md:text-4xl">{tool.name}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{tool.description}</p>
          </div>
        </div>
        <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-paper text-blue-700 shadow-sm" title="Private mode on">
          <FileCheck2 className="h-4 w-4" aria-hidden="true" />
        </div>
      </div>
    </header>
  );
}

function PlannedToolPanel({ tool }: { tool: ToolDefinition }) {
  return (
    <div className="grid gap-3 rounded-lg border border-line bg-white p-4 shadow-soft">
      <h2 className="text-lg font-semibold text-ink">Implementation path</h2>
      <p className="text-sm text-muted">{getPlannedMessage(tool)}</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {tool.useCases.map((item) => (
          <div key={item} className="rounded-md border border-line bg-paper p-3 text-sm text-ink">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

type ToolControlsProps = {
  activeTool: ToolDefinition;
  imageFormat: ImageOutputFormat;
  onImageFormat: (format: ImageOutputFormat) => void;
  resizeWidth: number;
  resizeHeight: number;
  onResizeWidth: (value: number) => void;
  onResizeHeight: (value: number) => void;
  hashAlgorithm: HashAlgorithm;
  onHashAlgorithm: (algorithm: HashAlgorithm) => void;
  input: string;
  output: string;
  setInput: (value: string) => void;
  isBusy: boolean;
  onRun: (action?: string) => void;
};

function ToolControls(props: ToolControlsProps) {
  const showTextAreas =
    props.activeTool.status === 'live' &&
    ['text', 'form'].includes(props.activeTool.inputMode) &&
    !['rust-wasm-notes'].includes(props.activeTool.id);

  return (
    <div className="grid gap-4">
      {props.activeTool.id === 'image-convert' && (
        <label className="grid max-w-xs gap-2 text-sm font-semibold text-ink">
          Output format
          <select
            value={props.imageFormat}
            onChange={(event) => props.onImageFormat(event.target.value as ImageOutputFormat)}
            className="rounded-md border border-line bg-white px-3 py-2 text-sm"
          >
            <option value="webp">WebP</option>
            <option value="jpeg">JPG</option>
            <option value="png">PNG</option>
          </select>
        </label>
      )}

      {props.activeTool.id === 'image-resize' && (
        <div className="grid max-w-md gap-3 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-ink">
            Width
            <input
              type="number"
              min={1}
              max={8000}
              value={props.resizeWidth}
              onChange={(event) => props.onResizeWidth(Number(event.target.value))}
              className="rounded-md border border-line bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-ink">
            Height
            <input
              type="number"
              min={1}
              max={8000}
              value={props.resizeHeight}
              onChange={(event) => props.onResizeHeight(Number(event.target.value))}
              className="rounded-md border border-line bg-white px-3 py-2 text-sm"
            />
          </label>
        </div>
      )}

      {props.activeTool.id === 'hash' && (
        <label className="grid max-w-xs gap-2 text-sm font-semibold text-ink">
          Hash algorithm
          <select
            value={props.hashAlgorithm}
            onChange={(event) => props.onHashAlgorithm(event.target.value as HashAlgorithm)}
            className="rounded-md border border-line bg-white px-3 py-2 text-sm"
          >
            <option value="MD5">MD5</option>
            <option value="SHA-1">SHA-1</option>
            <option value="SHA-256">SHA-256</option>
            <option value="SHA-384">SHA-384</option>
            <option value="SHA-512">SHA-512</option>
          </select>
        </label>
      )}

      <ActionBar
        activeTool={props.activeTool}
        isBusy={props.isBusy}
        onRun={props.onRun}
        output={props.output}
      />

      {showTextAreas && (
        <div className="grid gap-4 xl:grid-cols-2">
          <label className="grid min-w-0 gap-2 text-sm font-semibold text-ink">
            <span>{props.activeTool.id === 'wasm-runner' ? 'Export name (optional)' : 'Input'}</span>
            <textarea
              value={props.input}
              onChange={(event) => props.setInput(event.target.value)}
              rows={12}
              className="min-h-[340px] rounded-xl border border-line bg-[#fbfdff] p-4 font-mono text-sm leading-6 text-ink shadow-inner outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </label>
          <div className="grid min-w-0 gap-2 text-sm font-semibold text-ink">
            <span>Output</span>
            <CodeOutput value={props.output} />
          </div>
        </div>
      )}

      {props.activeTool.id === 'html-css-js-editor' && props.output ? (
        <div className="grid gap-2">
          <p className="text-sm font-semibold text-ink">Sandbox preview</p>
          <iframe
            title="HTML CSS JS preview"
            sandbox="allow-scripts"
            srcDoc={props.output}
            className="h-80 w-full rounded-lg border border-line bg-white shadow-soft"
          />
        </div>
      ) : null}

    </div>
  );
}

function ActionBar({
  activeTool,
  isBusy,
  onRun,
  output,
}: {
  activeTool: ToolDefinition;
  isBusy: boolean;
  onRun: (action?: string) => void;
  output: string;
}) {
  const commonClass = 'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition';
  const primaryClass = `${commonClass} bg-moss text-white hover:bg-ink disabled:cursor-not-allowed disabled:opacity-60`;
  const secondaryClass = `${commonClass} border border-line bg-white text-ink hover:border-sage hover:text-moss`;

  if (activeTool.status !== 'live') {
    return (
      <button type="button" disabled={isBusy} onClick={() => onRun()} className={primaryClass}>
        View implementation notes
      </button>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {activeTool.id === 'json-format' && (
        <>
          <button type="button" disabled={isBusy} onClick={() => onRun()} className={primaryClass}>
            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Format
          </button>
          <button type="button" disabled={isBusy} onClick={() => onRun('minify')} className={secondaryClass}>
            Minify
          </button>
        </>
      )}

      {activeTool.id === 'base64' && (
        <>
          <button type="button" disabled={isBusy} onClick={() => onRun('encode')} className={primaryClass}>
            Encode
          </button>
          <button type="button" disabled={isBusy} onClick={() => onRun('decode')} className={secondaryClass}>
            Decode
          </button>
        </>
      )}

      {activeTool.id === 'url-codec' && (
        <>
          <button type="button" disabled={isBusy} onClick={() => onRun('encode')} className={primaryClass}>
            Encode
          </button>
          <button type="button" disabled={isBusy} onClick={() => onRun('decode')} className={secondaryClass}>
            Decode
          </button>
        </>
      )}

      {activeTool.id === 'yaml-json' && (
        <>
          <button type="button" disabled={isBusy} onClick={() => onRun('yaml-to-json')} className={primaryClass}>
            YAML to JSON
          </button>
          <button type="button" disabled={isBusy} onClick={() => onRun('json-to-yaml')} className={secondaryClass}>
            JSON to YAML
          </button>
        </>
      )}

      {activeTool.id === 'csv-json' && (
        <>
          <button type="button" disabled={isBusy} onClick={() => onRun('csv-to-json')} className={primaryClass}>
            CSV to JSON
          </button>
          <button type="button" disabled={isBusy} onClick={() => onRun('json-to-csv')} className={secondaryClass}>
            JSON to CSV
          </button>
        </>
      )}

      {activeTool.id === 'base64-image' && (
        <>
          <button type="button" disabled={isBusy} onClick={() => onRun('encode')} className={primaryClass}>
            Image to Base64
          </button>
          <button type="button" disabled={isBusy} onClick={() => onRun('decode')} className={secondaryClass}>
            Base64 to Image
          </button>
        </>
      )}

      {!['json-format', 'base64', 'url-codec', 'yaml-json', 'csv-json', 'base64-image'].includes(activeTool.id) && (
        <button type="button" disabled={isBusy} onClick={() => onRun()} className={primaryClass}>
          {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Run
        </button>
      )}

      {activeTool.id === 'ics-generator' && output && (
        <>
          <button
            type="button"
            onClick={() => downloadText(output, 'event.ics', 'text/calendar;charset=utf-8')}
            className={secondaryClass}
          >
            <Download className="h-4 w-4" />
            Download ICS
          </button>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(staticIcsDataUrl(output))}
            className={secondaryClass}
          >
            <Copy className="h-4 w-4" />
            Copy static URL
          </button>
        </>
      )}
    </div>
  );
}

function CodeOutput({ value }: { value: string }) {
  return (
    <pre className="min-h-[340px] overflow-auto rounded-xl border border-line bg-[#fbfdff] p-4 font-mono text-sm leading-6 text-ink shadow-inner">
      {value ? <HighlightedCode value={value} /> : <span className="text-muted">Output will appear here.</span>}
    </pre>
  );
}

function HighlightedCode({ value }: { value: string }) {
  const tokens = value.split(/("(?:\\.|[^"\\])*"|\btrue\b|\bfalse\b|\bnull\b|-?\b\d+(?:\.\d+)?\b)/g);

  return (
    <>
      {tokens.map((token, index) => {
        let className = 'text-ink';
        if (/^"/.test(token)) className = token.includes(':') ? 'text-blue-700' : 'text-emerald-700';
        else if (/^-?\d/.test(token)) className = 'text-coral';
        else if (/^(true|false)$/.test(token)) className = 'text-fuchsia-700';
        else if (token === 'null') className = 'text-muted';
        else if (/^(STDOUT|STDERR|DIAGNOSTICS|JAVASCRIPT|FETCH|PYTHON REQUESTS|C# HTTPCLIENT|Result \d+)/.test(token.trim())) {
          className = 'text-coral';
        }

        return (
          <span key={`${token}-${index}`} className={className}>
            {token}
          </span>
        );
      })}
    </>
  );
}

function requireFile(files: readonly File[], message: string): File {
  const [file] = files;
  if (!file) throw new Error(message);
  return file;
}

function getPassiveOutput(toolId: string): string {
  if (toolId === 'uuid') {
    return Array.from({ length: 10 }, () => generateUuid()).join('\n');
  }

  if (toolId === 'password-generator') {
    return generatePasswords();
  }

  return '';
}

function toBlobPart(bytes: Uint8Array): BlobPart {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function fileExtensionForMime(mimeType: string, fallbackName: string): string {
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
  if (mimeType.includes('png')) return 'png';
  return fallbackName.split('.').pop() || 'bin';
}

function getRustWasmNotes() {
  return `Rust to WASM local workflow

1. Install Rust
   rustup default stable

2. Install wasm-pack
   cargo install wasm-pack

3. Create a library crate
   cargo new --lib filesuite_wasm_tool

4. Add wasm-bindgen
   cargo add wasm-bindgen

5. Example src/lib.rs
   use wasm_bindgen::prelude::*;

   #[wasm_bindgen]
   pub fn double(value: i32) -> i32 {
       value * 2
   }

6. Build for browser
   wasm-pack build --target web --release

7. Load from Next.js
   import init, { double } from './pkg/filesuite_wasm_tool.js';
   await init();
   console.log(double(21));

Notes
- Keep generated WASM assets in public/wasm or lazy-load from a module route.
- Run heavy WASM calls inside a Web Worker.
- Do not use this for arbitrary Rust source compilation in the browser.`;
}

function parseRegexInput(input: string) {
  const [firstLine = '', ...rest] = input.split(/\r?\n/);
  const match = /^\/(.+)\/([dgimsuvy]*)$/.exec(firstLine.trim());

  if (!match) {
    throw new Error('First line must be a JavaScript regex like /error\\s+\\d+/gi.');
  }

  return {
    pattern: match[1],
    flags: match[2],
    text: rest.join('\n'),
  };
}

function splitForTwoPane(input: string): [string, string] {
  const separator = '\n---\n';
  const index = input.indexOf(separator);

  if (index === -1) {
    throw new Error('Put the first value above a line containing --- and the second value below it.');
  }

  return [input.slice(0, index), input.slice(index + separator.length)];
}

function getPlannedMessage(tool: ToolDefinition) {
  if (tool.status === 'ai-opt-in') {
    return `${tool.name} should be a separate Online AI Mode: extract text locally where possible, ask for explicit consent, then call an OpenAI-compatible text/audio model with either a user-provided key or a minimal backend proxy. It cannot be advertised as strict offline processing.`;
  }

  return `${tool.name} is in the roadmap. Keep parsing in a Web Worker; use Rust/C++ WASM for CPU-heavy parsing, compression, PDF, archive, or tokenizer work.`;
}

function makeSampleInput(toolId: string): string {
  switch (toolId) {
    case 'jwt-decoder':
      return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6ImZpbGVzdWl0ZS5kZXYiLCJpYXQiOjE1MTYyMzkwMjJ9.signature';
    case 'base64':
      return 'filesuite.dev';
    case 'url-codec':
      return 'https://filesuite.dev/tools/json-formatter?debug=true&source=api payload';
    case 'timestamp':
      return `${Math.floor(Date.now() / 1000)}`;
    case 'hash':
      return 'Hash this private text locally.';
    case 'regex-tester':
      return '/error\\s+\\d+/gi\ninfo 100\nerror 401\nerror 500';
    case 'text-diff':
    case 'prompt-diff':
      return 'Line one\nold value\n---\nLine one\nnew value';
    case 'json-diff':
      return '{\n  "enabled": true,\n  "version": 1\n}\n---\n{\n  "enabled": false,\n  "version": 2\n}';
    case 'cron-parser':
      return '*/15 * * * *';
    case 'yaml-json':
      return 'name: filesuite.dev\nprivate: true\ntools:\n  - json\n  - jwt';
    case 'csv-json':
      return 'name,type\nJSON Formatter,devtool\nJWT Decoder,devtool';
    case 'xml-format':
      return '<root><tool name="JSON Formatter"><status>live</status></tool></root>';
    case 'ics-generator':
      return 'Generated locally in the browser.';
    case 'openapi-validator':
      return 'openapi: 3.0.3\ninfo:\n  title: filesuite API\n  version: 1.0.0\npaths:\n  /tools:\n    get:\n      responses:\n        "200":\n          description: OK';
    case 'curl-converter':
      return 'curl -X POST https://api.example.com/messages -H "Authorization: Bearer token" -H "Content-Type: application/json" -d \'{"text":"hello"}\'';
    case 'token-estimator':
      return 'Estimate how many tokens this private prompt may use before sending it to a model.';
    case 'json-schema-generator':
      return '{\n  "name": "filesuite.dev",\n  "private": true,\n  "tags": ["json", "jwt", "wasm"]\n}';
    case 'javascript-compiler':
      return 'const values = [1, 2, 3, 4];\nconsole.log(values.map((value) => value * 2).join(", "));';
    case 'python-compiler':
      return 'values = [1, 2, 3, 4]\nprint(", ".join(str(value * 2) for value in values))';
    case 'typescript-playground':
      return 'type Tool = { name: string; local: boolean };\n\nconst tool: Tool = { name: "JSON Formatter", local: true };\nconsole.log(tool);';
    case 'sql-compiler':
      return 'SELECT category, COUNT(*) AS total\nFROM tools\nGROUP BY category\nORDER BY total DESC;';
    case 'html-css-js-editor':
      return '<main>\n  <h1>Hello filesuite.dev</h1>\n  <button onclick="document.body.dataset.clicked = true">Click</button>\n</main>\n<style>\n  body { font-family: system-ui; padding: 24px; }\n  h1 { color: #ff6b35; }\n</style>';
    case 'wasm-runner':
      return '';
    case 'password-generator':
      return 'Click Run to generate 8 local passwords.';
    case 'certificate-decoder':
      return '-----BEGIN CERTIFICATE-----\nMIIBhTCCASugAwIBAgIUQm9nc1NhbXBsZUNlcnRGb3JGaWxlU3VpdGUwCgYIKoZIzj0EAwIwFjEUMBIGA1UEAwwLZmlsZXN1aXRlLmRldjAeFw0yNjA3MDcwMDAwMDBaFw0yNzA3MDcwMDAwMDBaMBYxFDASBgNVBAMMC2ZpbGVzdWl0ZS5kZXYwWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAoGCCqGSM49BAMCA0gAMEUCIQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=\n-----END CERTIFICATE-----';
    case 'json-format':
    default:
      return '{\n  "name": "filesuite.dev",\n  "private": true\n}';
  }
}
