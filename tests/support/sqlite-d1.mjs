import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";

export function sqliteD1(sqlite) {
  return {
    prepare(sql) {
      let args = [];
      return {
        bind(...values) { args = values; return this; },
        async first() { return sqlite.prepare(sql).get(...args) ?? null; },
        async all() { return { success: true, results: sqlite.prepare(sql).all(...args) }; },
        async run() { return { success: true, meta: { changes: Number(sqlite.prepare(sql).run(...args).changes) } }; },
        execute() { return { success: true, results: sqlite.prepare(sql).all(...args) }; },
      };
    },
    async batch(statements) {
      sqlite.exec("BEGIN IMMEDIATE");
      try { const results = statements.map(s => s.execute()); sqlite.exec("COMMIT"); return results; }
      catch (error) { sqlite.exec("ROLLBACK"); throw error; }
    },
  };
}
export function migratedDatabase(path = ":memory:") {
  const sqlite = new DatabaseSync(path);
  sqlite.exec("PRAGMA foreign_keys = ON");
  for (const file of readdirSync(new URL("../../drizzle/", import.meta.url)).filter(f => /^\d+.*\.sql$/.test(f)).sort()) {
    sqlite.exec(readFileSync(new URL(`../../drizzle/${file}`, import.meta.url), "utf8"));
  }
  return { sqlite, database: sqliteD1(sqlite) };
}
