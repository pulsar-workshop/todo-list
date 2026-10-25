import { App, net, storage } from "pulsar"

type Todo = {
  ID: string
  text: string
  done: boolean
  createdAT: number
  completedAT: number | null
}

type SyncSettings = {
  host: string
  port: string
  password: string
}

const DEFAULT_PORT = "8787"

const app = new App()

const sync = { dirty: false }

let syncSettings: SyncSettings = { host: "", port: DEFAULT_PORT, password: "" }

const newID = () => {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

let todos: Todo[] = []

const parseTodo = (value: unknown): Todo | null => {
  if (typeof value !== "object" || value === null) return null

  const record = value as Record<string, unknown>
  const rawID = record.ID ?? record.id

  if (typeof rawID !== "string") return null
  if (typeof record.text !== "string") return null
  if (typeof record.done !== "boolean") return null

  const rawCreatedAT = record.createdAT ?? record.createdAt
  const createdAT = typeof rawCreatedAT === "number" ? rawCreatedAT : Date.now()
  const completedAT = typeof record.completedAT === "number" ? record.completedAT : null

  return {
    ID: rawID,
    text: record.text,
    done: record.done,
    createdAT,
    completedAT,
  }
}

const syncBase = (): string => {
  if (!syncSettings.host) return ""

  return `http://${syncSettings.host}:${syncSettings.port}`
}

const syncHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = { "content-type": "application/json" }

  if (syncSettings.password) headers.authorization = `Bearer ${syncSettings.password}`

  return headers
}

const setStatus = (status: string) => {
  app.store.set("syncStatus", status)
  app.store.set("syncHost", syncSettings.host)
  app.store.set("syncPort", syncSettings.port)
  app.store.set("syncPassword", syncSettings.password)
}

const push = async () => {
  const base = syncBase()

  if (!base) {
    setStatus("off")
    return
  }

  sync.dirty = true

  try {
    await net.fetch(`${base}/todos`, {
      method: "POST",
      headers: syncHeaders(),
      body: JSON.stringify(todos),
      timeoutMs: 2500,
    })

    sync.dirty = false
    setStatus("ok")
  } catch {
    setStatus("error")
  }
}

const save = () => {
  void storage.set("todos", todos)
  void push()
}

const pull = async () => {
  const base = syncBase()

  if (!base || sync.dirty) return

  try {
    const response = await net.fetch(`${base}/todos`, { headers: syncHeaders(), timeoutMs: 2500 })
    const list = JSON.parse(response.text) as unknown

    setStatus("ok")

    if (!Array.isArray(list)) return

    const next = list.map(parseTodo).filter((todo): todo is Todo => todo !== null)

    if (JSON.stringify(next) === JSON.stringify(todos)) return

    todos = next
    render()
  } catch {
    setStatus("error")
  }
}

const loadSync = async () => {
  const saved = await storage.get("sync")

  if (typeof saved === "object" && saved !== null) {
    const record = saved as Record<string, unknown>
    const host = typeof record.host === "string" ? record.host : ""
    const port = typeof record.port === "string" ? record.port : DEFAULT_PORT
    const password = typeof record.password === "string" ? record.password : ""

    syncSettings = { host, port, password }
  }

  setStatus(syncSettings.host ? "idle" : "off")
}

const saveSync = async (params: { host?: unknown; port?: unknown; password?: unknown }) => {
  const host = typeof params?.host === "string" ? params.host.trim() : ""
  const port = typeof params?.port === "string" ? params.port.trim() : ""
  const password = typeof params?.password === "string" ? params.password : ""

  syncSettings = { host, port: port || DEFAULT_PORT, password }

  await storage.set("sync", syncSettings)

  sync.dirty = false
  setStatus(host ? "idle" : "off")

  await pull()
}

const render = () => {
  app.store.set("todos", todos)
  app.store.set("activeCount", todos.filter((todo) => !todo.done).length)
}

const addTodo = (params: { text?: unknown }) => {
  const text = typeof params?.text === "string" ? params.text.trim() : ""

  if (!text) return

  todos = [
    ...todos,
    {
      ID: newID(),
      text,
      done: false,
      createdAT: Date.now(),
      completedAT: null,
    },
  ]

  render()
  save()
}

const toggleTodo = (params: { ID?: unknown }) => {
  const ID = typeof params?.ID === "string" ? params.ID : ""

  if (!ID) return

  const target = todos.find((todo) => todo.ID === ID)

  if (!target) return

  const done = !target.done

  todos = todos.map((todo) => {
    if (todo.ID !== ID) return todo

    return {
      ...todo,
      done,
      completedAT: done ? Date.now() : null,
    }
  })

  render()
  save()
}

const deleteTodo = (params: { ID?: unknown }) => {
  const ID = typeof params?.ID === "string" ? params.ID : ""

  if (!ID) return

  todos = todos.filter((todo) => todo.ID !== ID)

  render()
  save()
}

const setTodoDate = (params: { ID?: unknown; createdAT?: unknown }) => {
  const ID = typeof params?.ID === "string" ? params.ID : ""
  const rawCreatedAT = params?.createdAT
  const createdAT = typeof rawCreatedAT === "number" && Number.isFinite(rawCreatedAT) ? rawCreatedAT : null

  if (!ID || createdAT === null) return

  const exists = todos.some((todo) => todo.ID === ID)

  if (!exists) return

  todos = todos.map((todo) => (todo.ID === ID ? { ...todo, createdAT } : todo))

  render()
  save()
}

const restore = async () => {
  const saved = await storage.get("todos")
  const list = Array.isArray(saved) ? saved : []

  todos = list.map(parseTodo).filter((todo): todo is Todo => todo !== null)

  render()
}

app.on("add-todo", addTodo)
app.on("toggle-todo", toggleTodo)
app.on("delete-todo", deleteTodo)
app.on("set-todo-date", setTodoDate)
app.on("save-sync", saveSync)

const start = async () => {
  await loadSync()
  await restore()
  await pull()

  app.run()

  setInterval(() => {
    if (!syncSettings.host) return

    if (sync.dirty) void push()
    else void pull()
  }, 4000)
}

void start()
