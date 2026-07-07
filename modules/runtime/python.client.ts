type PyodideInterface = {
  setStdout(options: { batched: (text: string) => void }): void;
  setStderr(options: { batched: (text: string) => void }): void;
  runPythonAsync(code: string): Promise<unknown>;
};

type PyodideWindow = Window & {
  loadPyodide?: (options: { indexURL: string; fullStdLib?: boolean }) => Promise<PyodideInterface>;
};

let pyodidePromise: Promise<PyodideInterface> | null = null;

export async function runPythonCode(sourceCode: string): Promise<string> {
  const pyodide = await getPyodide();
  const output: string[] = [];

  pyodide.setStdout({ batched: (text) => output.push(text) });
  pyodide.setStderr({ batched: (text) => output.push(text) });

  const result = await pyodide.runPythonAsync(sourceCode);
  if (result !== undefined) output.push(String(result));

  return output.join('\n') || '(no output)';
}

function getPyodide() {
  pyodidePromise ??= loadPyodideScript().then(() => {
    const loader = (window as PyodideWindow).loadPyodide;
    if (!loader) throw new Error('Pyodide loader was not available.');

    return loader({
      indexURL: '/pyodide/',
      fullStdLib: false,
    });
  });

  return pyodidePromise;
}

function loadPyodideScript() {
  if ((window as PyodideWindow).loadPyodide) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-pyodide-loader="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Could not load Pyodide.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = '/pyodide/pyodide.js';
    script.async = true;
    script.dataset.pyodideLoader = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Pyodide.'));
    document.head.appendChild(script);
  });
}
