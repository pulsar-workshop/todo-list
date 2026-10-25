import { createHash } from "crypto"
import { readFileSync, writeFileSync } from "fs"
import { join } from "path"

type JournalEntry = {
  tag: string
  when: number
}

const root = join(import.meta.dir, "..")
const folder = join(root, "drizzle")
const journal = JSON.parse(readFileSync(join(folder, "meta/_journal.json"), "utf8")) as { entries: JournalEntry[] }

const migrations = journal.entries.map((entry) => {
  const query = readFileSync(join(folder, `${entry.tag}.sql`), "utf8")

  return {
    sql: query
      .split("--> statement-breakpoint")
      .map((statement) => statement.trim())
      .filter(Boolean),
    folderMillis: entry.when,
    hash: createHash("sha256").update(query).digest("hex"),
  }
})

writeFileSync(join(root, "db/migrations.json"), `${JSON.stringify(migrations, null, 2)}\n`)
