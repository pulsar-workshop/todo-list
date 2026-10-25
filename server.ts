import { Database } from "bun:sqlite"
import { join } from "path"

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

const db = new Database(dbPath)

db.exec("PRAGMA journal_mode = WAL")
db.exec("PRAGMA busy_timeout = 5000")
db.exec(`
  CREATE TABLE IF NOT EXISTS todos (
    ID TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    updatedAT INTEGER NOT NULL,
    deleted INTEGER NOT NULL DEFAULT 0
  )
`)
db.exec(`
  CREATE TABLE IF NOT EXISTS tags (
    ID TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    updatedAT INTEGER NOT NULL,
    deleted INTEGER NOT NULL DEFAULT 0
  )
`)
db.exec(`
  CREATE TABLE IF NOT EXISTS files (
    key TEXT PRIMARY KEY,
    data BLOB NOT NULL,
    updatedAT INTEGER NOT NULL
  )
`)

const selectTodo = db.query<{ ID: string; data: string; updatedAT: number; deleted: number }, [string]>(
  "SELECT ID, data, updatedAT, deleted FROM todos WHERE ID = ?",
)
const selectTag = db.query<{ ID: string; data: string; updatedAT: number; deleted: number }, [string]>(
  "SELECT ID, data, updatedAT, deleted FROM tags WHERE ID = ?",
)
const insertTodo = db.query("INSERT INTO todos (ID, data, updatedAT, deleted) VALUES (?, ?, ?, ?)")
const updateTodo = db.query("UPDATE todos SET data = ?, updatedAT = ? WHERE ID = ?")
const markTodoDeleted = db.query(
  "INSERT INTO todos (ID, data, updatedAT, deleted) VALUES (?, '{}', ?, 1) ON CONFLICT(ID) DO UPDATE SET deleted = 1",
)
const insertTag = db.query("INSERT INTO tags (ID, data, updatedAT, deleted) VALUES (?, ?, ?, ?)")
const updateTag = db.query("UPDATE tags SET data = ?, updatedAT = ? WHERE ID = ?")
const markTagDeleted = db.query(
  "INSERT INTO tags (ID, data, updatedAT, deleted) VALUES (?, '{}', ?, 1) ON CONFLICT(ID) DO UPDATE SET deleted = 1",
)
const listTodos = db.query<{ data: string }, []>("SELECT data FROM todos WHERE deleted = 0 ORDER BY rowid")
const listTags = db.query<{ data: string }, []>("SELECT data FROM tags WHERE deleted = 0 ORDER BY rowid")
const listDeletedTodos = db.query<{ ID: string }, []>("SELECT ID FROM todos WHERE deleted = 1")
const listDeletedTags = db.query<{ ID: string }, []>("SELECT ID FROM tags WHERE deleted = 1")
const listFiles = db.query<{ key: string }, []>("SELECT key FROM files ORDER BY key")
const selectFile = db.query<{ data: Uint8Array }, [string]>("SELECT data FROM files WHERE key = ?")
const upsertFile = db.query(
  "INSERT INTO files (key, data, updatedAT) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET data = excluded.data, updatedAT = excluded.updatedAT",
)
const deleteFile = db.query("DELETE FROM files WHERE key = ?")
const deleteTaskFiles = db.query("DELETE FROM files WHERE key LIKE ?")

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

const asUpdated = (value: unknown): number => {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

const mergeTodo = (value: unknown): void => {
  if (!isRecord(value)) return
  if (typeof value.ID !== "string") return

  const ID = value.ID
  const updatedAT = asUpdated(value.updatedAT)
  const existing = selectTodo.get(ID)

  if (existing?.deleted) return

  if (!existing) {
    insertTodo.run(ID, JSON.stringify(value), updatedAT, 0)
    return
  }

  if (updatedAT > existing.updatedAT) updateTodo.run(JSON.stringify(value), updatedAT, ID)
}

const mergeTag = (value: unknown): void => {
  if (!isRecord(value)) return
  if (typeof value.ID !== "string") return

  const ID = value.ID
  const updatedAT = asUpdated(value.updatedAT)
  const existing = selectTag.get(ID)

  if (existing?.deleted) return

  if (!existing) {
    insertTag.run(ID, JSON.stringify(value), updatedAT, 0)
    return
  }

  if (updatedAT > existing.updatedAT) updateTag.run(JSON.stringify(value), updatedAT, ID)
}

const deleteTodo = (ID: string): void => {
  markTodoDeleted.run(ID, Date.now())
  deleteTaskFiles.run(`${ID}/%`)
}

const deleteTag = (ID: string): void => {
  markTagDeleted.run(ID, Date.now())
}

const state = (): State => {
  return {
    todos: listTodos.all().map((row) => JSON.parse(row.data) as unknown),
    tags: listTags.all().map((row) => JSON.parse(row.data) as unknown),
    deletedTodos: listDeletedTodos.all().map((row) => row.ID),
    deletedTags: listDeletedTags.all().map((row) => row.ID),
    files: listFiles.all().map((row) => row.key),
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
      return new Response("unauthorized", {
        status: 401,
        headers: { "www-authenticate": "Bearer" },
      })
    }

    if (path === "/file") return handleFile(request, url)

    if (request.method === "GET") return json(state())
    if (request.method !== "POST") return new Response("method not allowed", { status: 405 })

    const body = (await request.json().catch(() => null)) as unknown

    if (!isRecord(body)) return new Response("expected a JSON object", { status: 400 })
    if (!Array.isArray(body.todos)) return new Response("expected todos to be an array", { status: 400 })

    const todos = body.todos
    const deletedTodos = Array.isArray(body.deletedTodos)
      ? body.deletedTodos.filter((value): value is string => typeof value === "string")
      : []
    const deletedTags = Array.isArray(body.deletedTags)
      ? body.deletedTags.filter((value): value is string => typeof value === "string")
      : []
    const tags = Array.isArray(body.tags) ? body.tags : []

    db.transaction(() => {
      for (const ID of deletedTodos) deleteTodo(ID)
      for (const ID of deletedTags) deleteTag(ID)
      for (const todo of todos) mergeTodo(todo)
      for (const tag of tags) mergeTag(tag)
    })()

    return json(state())
  },
})

async function handleFile(request: Request, url: URL): Promise<Response> {
  const key = url.searchParams.get("key")

  if (!key) return new Response("expected key", { status: 400 })

  if (request.method === "GET") {
    const row = selectFile.get(key)

    if (!row) return new Response("not found", { status: 404 })

    const data = Buffer.from(row.data).toString("base64")

    return json({ key, size: row.data.byteLength, data })
  }

  if (request.method === "PUT") {
    const body = (await request.json().catch(() => null)) as unknown

    if (!isRecord(body) || typeof body.data !== "string") return new Response("expected base64 data", { status: 400 })

    const data = Buffer.from(body.data, "base64")

    upsertFile.run(key, data, Date.now())

    return json({ ok: true, size: data.byteLength })
  }

  if (request.method === "DELETE") {
    deleteFile.run(key)

    return json({ ok: true })
  }

  return new Response("method not allowed", { status: 405 })
}

console.log(`todo sync server on http://0.0.0.0:${server.port}`)
