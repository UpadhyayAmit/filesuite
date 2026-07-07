export async function inspectWasmModule(file: File, exportName = ''): Promise<string> {
  const bytes = await file.arrayBuffer();
  const module = await WebAssembly.compile(bytes);
  const imports = WebAssembly.Module.imports(module);
  const exports = WebAssembly.Module.exports(module);

  if (imports.length) {
    return JSON.stringify(
      {
        status: 'imports-required',
        message: 'This WASM module needs imports. Import wiring UI can be added next.',
        imports,
        exports,
      },
      null,
      2,
    );
  }

  const instance = await WebAssembly.instantiate(module, {});
  const callable = exportName || exports.find((item) => item.kind === 'function')?.name || '';
  const exported = callable ? instance.exports[callable] : null;

  let runResult: unknown = null;
  if (typeof exported === 'function') {
    runResult = exported();
  }

  return JSON.stringify(
    {
      status: 'loaded',
      selectedExport: callable || null,
      runResult,
      exports,
    },
    null,
    2,
  );
}
