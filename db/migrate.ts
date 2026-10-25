import type { Database } from "bun:sqlite"
import migrations from "./migrations.json"

type Migration = {
  sql: string[]
  folderMillis: number
  hash: string
}

const TABLE = "__drizzle_migrations"

export const migrate = (sqlite: Database): void => {
  sqlite.run(`CREATE TABLE IF NOT EXISTS "${TABLE}" (
    id SERIAL PRIMARY KEY,
    hash text NOT NULL,
    created_at numeric
  )`)

  let applied =
    sqlite
      .query<{ created_at: number | null }, []>(`SELECT created_at FROM "${TABLE}" ORDER BY created_at DESC LIMIT 1`)
      .get()?.created_at ?? null

  const run = sqlite.transaction(() => {
    for (const migration of migrations as Migration[]) {
      if (applied !== null && Number(applied) >= migration.folderMillis) continue

      for (const statement of migration.sql) sqlite.run(statement)

      sqlite.run(`INSERT INTO "${TABLE}" ("hash", "created_at") VALUES (?, ?)`, [
        migration.hash,
        migration.folderMillis,
      ])

      applied = migration.folderMillis
    }
  })

  run()
}
