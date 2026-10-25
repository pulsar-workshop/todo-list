import { existsSync, readFileSync, writeFileSync } from "fs"
import { join } from "path"

const port = Number(process.env.PORT ?? 8787)
const password = process.env.PASSWORD ?? ""
const statePath = join(import.meta.dir, "sync-state.json")

type State = {
  todos: unknown[]
  tags: unknown[]
}

const empty = (): State => ({ todos: [], tags: [] })

const load = (): State => {
  if (!existsSync(statePath)) return empty()

  try {
    const parsed = JSON.parse(readFileSync(statePath, "utf8")) as unknown

    if (!Array.isArray(parsed)) return empty()

    return { todos: parsed, tags: [] }
  } catch {
    return empty()
  }
}

const persist = (state: State) => {
  writeFileSync(statePath, JSON.stringify(state))
}

let state = load()

const server = Bun.serve({
  port,
  hostname: "0.0.0.0",
  async fetch(request) {
    const path = new URL(request.url).pathname

    if (path !== "/state") return new Response("not found", { status: 404 })

    if (password && request.headers.get("authorization") !== `Bearer ${password}`) {
      return new Response("unauthorized", { status: 401, headers: { "www-authenticate": "Bearer" } })
    }

    if (request.method === "GET") return Response.json(state)

    if (request.method === "POST") {
      const body = (await request.json().catch(() => null)) as unknown

      if (typeof body !== "object" || body === null) return new Response("expected a JSON object", { status: 400 })

      const record = body as Record<string, unknown>

      if (!Array.isArray(record.todos)) return new Response("expected todos to be an array", { status: 400 })

      state = {
        todos: record.todos,
        tags: Array.isArray(record.tags) ? record.tags : [],
      }

      persist(state)

      return Response.json({ ok: true })
    }

    return new Response("method not allowed", { status: 405 })
  },
})

console.log(`todo sync server on http://0.0.0.0:${server.port}`)
