import type { Database, SqlJsStatic } from 'sql.js';

let sqlPromise: Promise<SqlJsStatic> | null = null;

export async function runSql(input: string): Promise<string> {
  const SQL = await getSql();
  const db = new SQL.Database();

  seedDatabase(db);

  try {
    const results = db.exec(input);
    if (!results.length) return 'Query executed. No rows returned.';

    return results
      .map((result, index) => {
        const header = `Result ${index + 1}`;
        const rows = result.values.map((row) =>
          Object.fromEntries(result.columns.map((column, columnIndex) => [column, row[columnIndex]])),
        );
        return `${header}\n${JSON.stringify(rows, null, 2)}`;
      })
      .join('\n\n');
  } finally {
    db.close();
  }
}

function getSql() {
  sqlPromise ??= import('sql.js').then(({ default: initSqlJs }) =>
    initSqlJs({
      locateFile: (file) => new URL(`/wasm/${file}`, window.location.origin).toString(),
    }),
  );

  return sqlPromise;
}

function seedDatabase(db: Database) {
  db.run(`
    CREATE TABLE tools (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      local INTEGER NOT NULL
    );

    INSERT INTO tools (name, category, local) VALUES
      ('JSON Formatter', 'Core Developer', 1),
      ('JWT Decoder', 'Core Developer', 1),
      ('C++ Online Compiler', 'Code and Runtime', 0),
      ('SQL Online Compiler', 'Code and Runtime', 1);
  `);
}
