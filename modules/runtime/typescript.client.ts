import ts from 'typescript';

export function transpileTypeScript(input: string): string {
  const result = ts.transpileModule(input, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      strict: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
    reportDiagnostics: true,
  });

  const diagnostics = result.diagnostics?.length
    ? result.diagnostics
        .map((diagnostic) => {
          const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
          return `TS${diagnostic.code}: ${message}`;
        })
        .join('\n')
    : 'No transpile diagnostics.';

  return `DIAGNOSTICS\n${diagnostics}\n\nJAVASCRIPT\n${result.outputText}`;
}
