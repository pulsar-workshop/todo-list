import { Database } from "bun:sqlite"
import { drizzle } from "drizzle-orm/bun-sqlite"
import { migrate } from "drizzle-orm/bun-sqlite/migrator"
import { eq, like, sql } from "drizzle-orm"
import { join } from "path"
import { files, tags, todos } from "./db/schema.ts"

const port = Number(process.env.PORT ?? 8787)
const password = process.env.PASSWORD ?? ""
const dbPath = join(import.meta.dir, process.env.DB ?? "sync.db")

type State = {
  todos: unknown[]
  tags: unknown[]
  deletedTodos: string[]
  deletedTags: string[]
  files: string[]
}

const sqlite = new Database(dbPath)
sqlite.run("PRAGMA journal_mode = WAL")
sqlite.run("PRAGMA busy_timeout = 5000")

const db = drizzle(sqlite)

migrate(db, { migrationsFolder: join(import.meta.dir, "drizzle") })

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

const asUpdated = (value: unknown): number => {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

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
  const fileRows = db.select({ key: files.key }).from(files).orderBy(files.key).all()

  return {
    todos: todoRows.map((row) => JSON.parse(row.data) as unknown),
    tags: tagRows.map((row) => JSON.parse(row.data) as unknown),
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
    files: fileRows.map((row) => row.key),
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
    const deletedTodos = Array.isArray(body.deletedTodos)
      ? body.deletedTodos.filter((value): value is string => typeof value === "string")
      : []
    const deletedTags = Array.isArray(body.deletedTags)
      ? body.deletedTags.filter((value): value is string => typeof value === "string")
      : []

    db.transaction((tx) => {
      for (const ID of deletedTodos) {
        tx.insert(todos)
          .values({ ID, data: "{}", updatedAT: Date.now(), deleted: 1 })
          .onConflictDoUpdate({ target: todos.ID, set: { deleted: 1 } })
          .run()
        tx.delete(files)
          .where(like(files.key, `${ID}/%`))
          .run()
      }

      for (const ID of deletedTags) {
        tx.insert(tags)
          .values({ ID, data: "{}", updatedAT: Date.now(), deleted: 1 })
          .onConflictDoUpdate({ target: tags.ID, set: { deleted: 1 } })
          .run()
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
    })

    return json(state())
  },
})

async function handleFile(request: Request, url: URL): Promise<Response> {
  const key = url.searchParams.get("key")

  if (!key) return new Response("expected key", { status: 400 })

  if (request.method === "GET") {
    const row = db.select({ data: files.data }).from(files).where(eq(files.key, key)).get()

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

    return json({ ok: true, size: data.byteLength })
  }

  if (request.method === "DELETE") {
    db.delete(files).where(eq(files.key, key)).run()

    return json({ ok: true })
  }

  return new Response("method not allowed", { status: 405 })
}

console.log(`todo sync server on http://0.0.0.0:${server.port}`)
