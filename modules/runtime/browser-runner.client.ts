import { newQuickJSWASMModuleFromVariant, shouldInterruptAfterDeadline, type QuickJSWASMModule } from 'quickjs-emscripten-core';
import quickJsBrowserVariant from '@jitl/quickjs-singlefile-browser-release-sync';

let quickJsModulePromise: Promise<QuickJSWASMModule> | null = null;

function getQuickJsModule() {
  quickJsModulePromise ??= newQuickJSWASMModuleFromVariant(quickJsBrowserVariant);
  return quickJsModulePromise;
}

export async function runJavaScriptSnippet(sourceCode: string, timeoutMs = 1500): Promise<string> {
  const QuickJS = await getQuickJsModule();
  const runtime = QuickJS.newRuntime();
  runtime.setMemoryLimit(64 * 1024 * 1024);
  runtime.setMaxStackSize(1024 * 320);
  runtime.setInterruptHandler(shouldInterruptAfterDeadline(Date.now() + timeoutMs));

  const context = runtime.newContext();
  const logs: string[] = [];

  const logHandle = context.newFunction('log', (...args) => {
    logs.push(args.map((arg) => String(context.dump(arg))).join(' '));
  });
  const consoleHandle = context.newObject();
  context.setProp(consoleHandle, 'log', logHandle);
  context.setProp(consoleHandle, 'error', logHandle);
  context.setProp(context.global, 'console', consoleHandle);
  consoleHandle.dispose();
  logHandle.dispose();

  let disposed = false;
  const disposeOnce = () => {
    if (disposed) return;
    disposed = true;
    try {
      let pending = runtime.executePendingJobs();
      while (!pending.error && pending.value > 0) {
        pending = runtime.executePendingJobs();
      }
      pending.error?.dispose();
    } catch {
      // best-effort drain before teardown; fall through to dispose regardless
    }
    context.dispose();
    runtime.dispose();
  };

  const drainJobs = () => {
    let pending = runtime.executePendingJobs();
    while (!pending.error && pending.value > 0) {
      pending = runtime.executePendingJobs();
    }
    if (pending.error) {
      const message = context.dump(pending.error);
      pending.error.dispose();
      throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
    }
  };

  const run = (async () => {
    const evalResult = context.evalCode(`"use strict"; (async () => {\n${sourceCode}\n})()`);
    const promiseHandle = context.unwrapResult(evalResult);

    const settledPromise = context.resolvePromise(promiseHandle);
    drainJobs();
    const settledResult = await settledPromise;
    promiseHandle.dispose();

    const resultHandle = context.unwrapResult(settledResult);
    const value = context.dump(resultHandle);
    resultHandle.dispose();

    return [...logs, value === undefined ? '' : String(value)].filter(Boolean).join('\n') || '(no output)';
  })();

  const timeout = new Promise<never>((_resolve, reject) => {
    setTimeout(() => reject(new Error('JavaScript runner timed out.')), timeoutMs);
  });

  try {
    return await Promise.race([run, timeout]);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error));
  } finally {
    disposeOnce();
  }
}

export function buildHtmlPreview(input: string): string {
  return input.trim().startsWith('<')
    ? input
    : `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>body { font-family: system-ui; padding: 24px; }</style>
  </head>
  <body>
    ${input}
  </body>
</html>`;
}
