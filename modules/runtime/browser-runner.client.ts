export function runJavaScriptSnippet(sourceCode: string, timeoutMs = 1500): Promise<string> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      URL.createObjectURL(
        new Blob(
          [
            `
            self.fetch = () => Promise.reject(new Error('Network calls are disabled in this runner.'));
            self.importScripts = () => { throw new Error('importScripts is disabled in this runner.'); };
            const logs = [];
            console.log = (...args) => logs.push(args.map(String).join(' '));
            console.error = (...args) => logs.push(args.map(String).join(' '));
            self.onmessage = async (event) => {
              try {
                const result = await Function('"use strict"; return (async () => {\\n' + event.data + '\\n})()')();
                self.postMessage({ ok: true, output: [...logs, result === undefined ? '' : String(result)].filter(Boolean).join('\\n') });
              } catch (error) {
                self.postMessage({ ok: false, error: error instanceof Error ? error.message : String(error) });
              }
            };
            `,
          ],
          { type: 'text/javascript' },
        ),
      ),
    );

    const timeout = window.setTimeout(() => {
      worker.terminate();
      reject(new Error('JavaScript runner timed out.'));
    }, timeoutMs);

    worker.onmessage = (event: MessageEvent<{ ok: boolean; output?: string; error?: string }>) => {
      window.clearTimeout(timeout);
      worker.terminate();

      if (event.data.ok) resolve(event.data.output || '(no output)');
      else reject(new Error(event.data.error || 'JavaScript runner failed.'));
    };

    worker.onerror = () => {
      window.clearTimeout(timeout);
      worker.terminate();
      reject(new Error('JavaScript runner failed.'));
    };

    worker.postMessage(sourceCode);
  });
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
