import { Database } from "bun:sqlite"
import { drizzle } from "drizzle-orm/bun-sqlite"
import { and, eq, like, lt, ne, sql } from "drizzle-orm"
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { dirname, isAbsolute, join } from "path"
import { migrate } from "./db/migrate.ts"
import { files, folders, tags, todos } from "./db/schema.ts"

const THUMB_PREFIX = "thumb:"
const VIDEO_PATTERN = /\.(mp4|m4v|mov|webm|mkv|avi|3gp)$/i

const projectDir = import.meta.dir
const standalone = !existsSync(join(projectDir, "server.ts"))
const baseDir = standalone ? dirname(process.execPath) : projectDir

const loadEnv = (path: string): void => {
  if (!existsSync(path)) return

  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/)

    if (!match) continue

    const key = match[1]!
    const raw = match[2]!

    if (process.env[key] !== undefined) continue

    const quoted = (raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))

    process.env[key] = quoted ? raw.slice(1, -1) : raw
  }
}

loadEnv(join(baseDir, ".env"))
loadEnv(join(process.cwd(), ".env"))

const port = Number(process.env.PORT ?? 8787)
const password = process.env.PASSWORD ?? ""
const dbName = process.env.DB ?? "sync.db"
const dbPath = isAbsolute(dbName) ? dbName : join(baseDir, dbName)

const trashDays = (): number => {
  const days = Number(process.env.TRASH_DAYS ?? 30)

  return Number.isFinite(days) && days >= 0 ? days : 30
}

type State = {
  todos: unknown[]
  tags: unknown[]
  folders: unknown[]
  deletedTodos: string[]
  deletedTags: string[]
  deletedFolders: string[]
  files: string[]
}

const sqlite = new Database(dbPath)
sqlite.run("PRAGMA journal_mode = WAL")
sqlite.run("PRAGMA busy_timeout = 5000")

const db = drizzle(sqlite)

migrate(sqlite)

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

type Deletion = {
  ID: string
  at: number
}

const parseDeletions = (value: unknown): Deletion[] => {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((ID) => ({ ID, at: Number.MAX_SAFE_INTEGER }))
  }

  if (!isRecord(value)) return []

  const deletions: Deletion[] = []

  for (const [ID, at] of Object.entries(value)) {
    if (typeof at === "number" && Number.isFinite(at)) deletions.push({ ID, at })
  }

  return deletions
}

const isVideo = (key: string): boolean => {
  return VIDEO_PATTERN.test(key)
}

const thumbKey = (key: string): string => {
  return `${THUMB_PREFIX}${key}`
}

const saveThumb = (key: string, data: Buffer): void => {
  db.insert(files)
    .values({ key: thumbKey(key), data, updatedAT: Date.now() })
    .onConflictDoUpdate({ target: files.key, set: { data, updatedAT: Date.now() } })
    .run()
}

const generateThumb = (key: string, data: Uint8Array): boolean => {
  if (!isVideo(key)) return false

  const dir = mkdtempSync(join(tmpdir(), "pulsar-thumb-"))
  const input = join(dir, "input")
  const output = join(dir, "thumb.jpg")

  try {
    writeFileSync(input, data)

    const result = Bun.spawnSync(
      ["ffmpeg", "-y", "-ss", "0", "-i", input, "-frames:v", "1", "-vf", "scale=480:-1", "-q:v", "5", output],
      { stdout: "ignore", stderr: "ignore" },
    )

    if (result.exitCode !== 0 || !existsSync(output)) return false

    saveThumb(key, readFileSync(output))

    return true
  } catch {
    return false
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

const asUpdated = (value: unknown): number => {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

const purgeTrash = (): void => {
  const cutoff = Date.now() - trashDays() * 86400000

  const expiredTodos = db
    .select({ ID: todos.ID })
    .from(todos)
    .where(and(eq(todos.deleted, 1), lt(todos.updatedAT, cutoff), ne(todos.data, "{}")))
    .all()

  for (const row of expiredTodos) {
    db.delete(files)
      .where(like(files.key, `${row.ID}/%`))
      .run()
    db.delete(files)
      .where(like(files.key, `${THUMB_PREFIX}${row.ID}/%`))
      .run()
    db.update(todos).set({ data: "{}" }).where(eq(todos.ID, row.ID)).run()
  }

  db.update(tags)
    .set({ data: "{}" })
    .where(and(eq(tags.deleted, 1), lt(tags.updatedAT, cutoff), ne(tags.data, "{}")))
    .run()

  db.update(folders)
    .set({ data: "{}" })
    .where(and(eq(folders.deleted, 1), lt(folders.updatedAT, cutoff), ne(folders.data, "{}")))
    .run()
}

purgeTrash()
setInterval(purgeTrash, 3600000)

const state = (): State => {
  const todoRows = db
    .select({ data: todos.data })
    .from(todos)
    .where(eq(todos.deleted, 0))
    .orderBy(sql`rowid`)
    .all()
  const tagRows = db
    .select({ data: tags.data })
    .from(tags)
    .where(eq(tags.deleted, 0))
    .orderBy(sql`rowid`)
    .all()
  const folderRows = db
    .select({ data: folders.data })
    .from(folders)
    .where(eq(folders.deleted, 0))
    .orderBy(sql`rowid`)
    .all()
  const fileRows = db.select({ key: files.key }).from(files).orderBy(files.key).all()

  return {
    todos: todoRows.map((row) => JSON.parse(row.data) as unknown),
    tags: tagRows.map((row) => JSON.parse(row.data) as unknown),
    folders: folderRows.map((row) => JSON.parse(row.data) as unknown),
    deletedTodos: db
      .select({ ID: todos.ID })
      .from(todos)
      .where(eq(todos.deleted, 1))
      .all()
      .map((row) => row.ID),
    deletedTags: db
      .select({ ID: tags.ID })
      .from(tags)
      .where(eq(tags.deleted, 1))
      .all()
      .map((row) => row.ID),
    deletedFolders: db
      .select({ ID: folders.ID })
      .from(folders)
      .where(eq(folders.deleted, 1))
      .all()
      .map((row) => row.ID),
    files: fileRows.map((row) => row.key).filter((key) => !key.startsWith(THUMB_PREFIX)),
  }
}

const authorized = (request: Request): boolean => {
  return !password || request.headers.get("authorization") === `Bearer ${password}`
}

const json = (value: unknown, status = 200): Response => {
  return Response.json(value, { status })
}

const server = Bun.serve({
  port,
  hostname: "0.0.0.0",
  async fetch(request) {
    const url = new URL(request.url)
    const path = url.pathname

    if (path !== "/state" && path !== "/file") return new Response("not found", { status: 404 })
    if (!authorized(request)) {
      return new Response("unauthorized", { status: 401, headers: { "www-authenticate": "Bearer" } })
    }

    if (path === "/file") return handleFile(request, url)

    if (request.method === "GET") return json(state())
    if (request.method !== "POST") return new Response("method not allowed", { status: 405 })

    const body = (await request.json().catch(() => null)) as unknown

    if (!isRecord(body)) return new Response("expected a JSON object", { status: 400 })
    if (!Array.isArray(body.todos)) return new Response("expected todos to be an array", { status: 400 })

    const incomingTodos = body.todos
    const incomingTags = Array.isArray(body.tags) ? body.tags : []
    const incomingFolders = Array.isArray(body.folders) ? body.folders : []
    const deletedTodos = parseDeletions(body.deletedTodos)
    const deletedTags = parseDeletions(body.deletedTags)
    const deletedFolders = parseDeletions(body.deletedFolders)

    db.transaction((tx) => {
      for (const { ID, at } of deletedTodos) {
        const existing = tx
          .select({ deleted: todos.deleted, updatedAT: todos.updatedAT })
          .from(todos)
          .where(eq(todos.ID, ID))
          .get()

        if (existing?.deleted) continue
        if (existing && existing.updatedAT > at) continue

        if (existing) {
          tx.update(todos).set({ deleted: 1, updatedAT: Date.now() }).where(eq(todos.ID, ID)).run()
          continue
        }

        tx.insert(todos).values({ ID, data: "{}", updatedAT: Date.now(), deleted: 1 }).run()
      }

      for (const { ID, at } of deletedTags) {
        const existing = tx
          .select({ deleted: tags.deleted, updatedAT: tags.updatedAT })
          .from(tags)
          .where(eq(tags.ID, ID))
          .get()

        if (existing?.deleted) continue
        if (existing && existing.updatedAT > at) continue

        if (existing) {
          tx.update(tags).set({ deleted: 1, updatedAT: Date.now() }).where(eq(tags.ID, ID)).run()
          continue
        }

        tx.insert(tags).values({ ID, data: "{}", updatedAT: Date.now(), deleted: 1 }).run()
      }

      for (const { ID, at } of deletedFolders) {
        const existing = tx
          .select({ deleted: folders.deleted, updatedAT: folders.updatedAT })
          .from(folders)
          .where(eq(folders.ID, ID))
          .get()

        if (existing?.deleted) continue
        if (existing && existing.updatedAT > at) continue

        if (existing) {
          tx.update(folders).set({ deleted: 1, updatedAT: Date.now() }).where(eq(folders.ID, ID)).run()
          continue
        }

        tx.insert(folders).values({ ID, data: "{}", updatedAT: Date.now(), deleted: 1 }).run()
      }

      for (const value of incomingTodos) {
        if (!isRecord(value) || typeof value.ID !== "string") continue

        const ID = value.ID
        const updatedAT = asUpdated(value.updatedAT)
        const existing = tx
          .select({ deleted: todos.deleted, updatedAT: todos.updatedAT })
          .from(todos)
          .where(eq(todos.ID, ID))
          .get()

        if (existing?.deleted) continue

        if (!existing) {
          tx.insert(todos)
            .values({ ID, data: JSON.stringify(value), updatedAT, deleted: 0 })
            .run()
          continue
        }

        if (updatedAT > existing.updatedAT) {
          tx.update(todos)
            .set({ data: JSON.stringify(value), updatedAT })
            .where(eq(todos.ID, ID))
            .run()
        }
      }

      for (const value of incomingTags) {
        if (!isRecord(value) || typeof value.ID !== "string") continue

        const ID = value.ID
        const updatedAT = asUpdated(value.updatedAT)
        const existing = tx
          .select({ deleted: tags.deleted, updatedAT: tags.updatedAT })
          .from(tags)
          .where(eq(tags.ID, ID))
          .get()

        if (existing?.deleted) continue

        if (!existing) {
          tx.insert(tags)
            .values({ ID, data: JSON.stringify(value), updatedAT, deleted: 0 })
            .run()
          continue
        }

        if (updatedAT > existing.updatedAT) {
          tx.update(tags)
            .set({ data: JSON.stringify(value), updatedAT })
            .where(eq(tags.ID, ID))
            .run()
        }
      }

      for (const value of incomingFolders) {
        if (!isRecord(value) || typeof value.ID !== "string") continue

        const ID = value.ID
        const updatedAT = asUpdated(value.updatedAT)
        const existing = tx
          .select({ deleted: folders.deleted, updatedAT: folders.updatedAT })
          .from(folders)
          .where(eq(folders.ID, ID))
          .get()

        if (existing?.deleted) continue

        if (!existing) {
          tx.insert(folders)
            .values({ ID, data: JSON.stringify(value), updatedAT, deleted: 0 })
            .run()
          continue
        }

        if (updatedAT > existing.updatedAT) {
          tx.update(folders)
            .set({ data: JSON.stringify(value), updatedAT })
            .where(eq(folders.ID, ID))
            .run()
        }
      }
    })

    return json(state())
  },
})

async function handleFile(request: Request, url: URL): Promise<Response> {
  const key = url.searchParams.get("key")

  if (!key) return new Response("expected key", { status: 400 })

  if (request.method === "GET") {
    let row = db.select({ data: files.data }).from(files).where(eq(files.key, key)).get()

    if (!row && key.startsWith(THUMB_PREFIX)) {
      const mainKey = key.slice(THUMB_PREFIX.length)
      const main = db.select({ data: files.data }).from(files).where(eq(files.key, mainKey)).get()

      if (main && generateThumb(mainKey, main.data)) {
        row = db.select({ data: files.data }).from(files).where(eq(files.key, key)).get()
      }
    }

    if (!row) return new Response("not found", { status: 404 })

    const data = Buffer.from(row.data).toString("base64")

    return json({ key, size: row.data.byteLength, data })
  }

  if (request.method === "PUT") {
    const body = (await request.json().catch(() => null)) as unknown

    if (!isRecord(body) || typeof body.data !== "string") return new Response("expected base64 data", { status: 400 })

    const data = Buffer.from(body.data, "base64")

    db.insert(files)
      .values({ key, data, updatedAT: Date.now() })
      .onConflictDoUpdate({ target: files.key, set: { data, updatedAT: Date.now() } })
      .run()

    generateThumb(key, data)

    return json({ ok: true, size: data.byteLength })
  }

  if (request.method === "DELETE") {
    db.delete(files).where(eq(files.key, key)).run()
    db.delete(files)
      .where(eq(files.key, thumbKey(key)))
      .run()

    return json({ ok: true })
  }

  return new Response("method not allowed", { status: 405 })
}

const shutdown = (): void => {
  try {
    sqlite.run("PRAGMA wal_checkpoint(TRUNCATE)")
    sqlite.close()
  } catch {}

  process.exit(0)
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)

console.log(`todo sync server on http://0.0.0.0:${server.port}`)
