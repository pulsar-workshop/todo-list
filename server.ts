import { existsSync, readFileSync, writeFileSync } from "fs"
import { join } from "path"

const port = Number(process.env.PORT ?? 8787)
const statePath = join(import.meta.dir, "sync-state.json")

const load = (): unknown[] => {
  if (!existsSync(statePath)) return []

  try {
    const parsed = JSON.parse(readFileSync(statePath, "utf8")) as unknown

    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const persist = (todos: unknown[]) => {
  writeFileSync(statePath, JSON.stringify(todos))
}

let todos = load()

const server = Bun.serve({
  port,
  hostname: "0.0.0.0",
  async fetch(request) {
    const path = new URL(request.url).pathname

    if (path !== "/todos") return new Response("not found", { status: 404 })

    if (request.method === "GET") return Response.json(todos)

    if (request.method === "POST") {
      const body = (await request.json().catch(() => null)) as unknown

      if (!Array.isArray(body)) return new Response("expected a JSON array", { status: 400 })

      todos = body
      persist(todos)

      return Response.json({ ok: true })
    }

    return new Response("method not allowed", { status: 405 })
  },
})

console.log(`todo sync server on http://0.0.0.0:${server.port}`)
