import { App, dialog, fs, net, paths, storage } from "pulsar"


type Subtask = {
  ID: string
  text: string
  done: boolean
  createdAT: number
  completedAT: number | null
}

type Attachment = {
  name: string
  path: string
}

type Todo = {
  ID: string
  text: string
  description: string
  done: boolean
  createdAT: number
  completedAT: number | null
  startAT: number | null
  endAT: number | null
  tags: string[]
  subtasks: Subtask[]
  files: Attachment[]
}

type Tag = {
  ID: string
  name: string
  color: string
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
let todos: Todo[] = []
let tags: Tag[] = []

const newID = () => {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

const asNumber = (value: unknown): number | null => {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

const parseSubtask = (value: unknown): Subtask | null => {
  if (typeof value !== "object" || value === null) return null

  const record = value as Record<string, unknown>

  if (typeof record.ID !== "string") return null
  if (typeof record.text !== "string") return null
  if (typeof record.done !== "boolean") return null

  return {
    ID: record.ID,
    text: record.text,
    done: record.done,
    createdAT: asNumber(record.createdAT) ?? Date.now(),
    completedAT: asNumber(record.completedAT),
  }
}

const parseAttachment = (value: unknown): Attachment | null => {
  if (typeof value !== "object" || value === null) return null

  const record = value as Record<string, unknown>

  if (typeof record.name !== "string") return null
  if (typeof record.path !== "string") return null

  return { name: record.name, path: record.path }
}

const parseTodo = (value: unknown): Todo | null => {
  if (typeof value !== "object" || value === null) return null

  const record = value as Record<string, unknown>
  const rawID = record.ID ?? record.id

  if (typeof rawID !== "string") return null
  if (typeof record.text !== "string") return null
  if (typeof record.done !== "boolean") return null

  const subtasks = Array.isArray(record.subtasks)
    ? record.subtasks.map(parseSubtask).filter((subtask): subtask is Subtask => subtask !== null)
    : []

  const files = Array.isArray(record.files)
    ? record.files.map(parseAttachment).filter((file): file is Attachment => file !== null)
    : []

  return {
    ID: rawID,
    text: record.text,
    description: typeof record.description === "string" ? record.description : "",
    done: record.done,
    createdAT: asNumber(record.createdAT ?? record.createdAt) ?? Date.now(),
    completedAT: asNumber(record.completedAT),
    startAT: asNumber(record.startAT),
    endAT: asNumber(record.endAT),
    tags: Array.isArray(record.tags) ? record.tags.filter((tag): tag is string => typeof tag === "string") : [],
    subtasks,
    files,
  }
}

const parseTag = (value: unknown): Tag | null => {
  if (typeof value !== "object" || value === null) return null

  const record = value as Record<string, unknown>

  if (typeof record.ID !== "string") return null
  if (typeof record.name !== "string") return null
  if (typeof record.color !== "string") return null

  return { ID: record.ID, name: record.name, color: record.color }
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
    await net.fetch(`${base}/state`, {
      method: "POST",
      headers: syncHeaders(),
      body: JSON.stringify({ todos, tags }),
      timeoutMs: 2500,
    })

    sync.dirty = false
    setStatus("ok")
  } catch {
    setStatus("error")
  }
}

const pull = async () => {
  const base = syncBase()

  if (!base || sync.dirty) return

  try {
    const response = await net.fetch(`${base}/state`, { headers: syncHeaders(), timeoutMs: 2500 })
    const parsed = JSON.parse(response.text) as unknown

    setStatus("ok")

    if (typeof parsed !== "object" || parsed === null) return

    const record = parsed as Record<string, unknown>
    const remoteTodos = Array.isArray(record.todos)
      ? record.todos.map(parseTodo).filter((todo): todo is Todo => todo !== null)
      : []
    const remoteTags = Array.isArray(record.tags)
      ? record.tags.map(parseTag).filter((tag): tag is Tag => tag !== null)
      : []

    const same = JSON.stringify(remoteTodos) === JSON.stringify(todos) && JSON.stringify(remoteTags) === JSON.stringify(tags)

    if (same) return

    todos = remoteTodos
    tags = remoteTags
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
  app.store.set("tags", tags)
  app.store.set("activeCount", todos.filter((todo) => !todo.done).length)
}

const save = () => {
  void storage.set("todos", todos)
  void storage.set("tags", tags)
  void push()
}

const addTodo = (params: { text?: unknown }) => {
  const text = typeof params?.text === "string" ? params.text.trim() : ""

  if (!text) return

  todos = [
    ...todos,
    {
      ID: newID(),
      text,
      description: "",
      done: false,
      createdAT: Date.now(),
      completedAT: null,
      startAT: null,
      endAT: null,
      tags: [],
      subtasks: [],
      files: [],
    },
  ]

  render()
  save()
}

const saveTask = (params: { json?: unknown; task?: unknown }) => {
  let value: unknown = params?.task

  if (typeof params?.json === "string") {
    try {
      value = JSON.parse(params.json)
    } catch {
      return
    }
  }

  const task = parseTodo(value)

  if (!task) return

  const exists = todos.some((todo) => todo.ID === task.ID)

  todos = exists ? todos.map((todo) => (todo.ID === task.ID ? task : todo)) : [...todos, task]

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

const deleteTodo = async (params: { ID?: unknown }) => {
  const ID = typeof params?.ID === "string" ? params.ID : ""

  if (!ID) return

  todos = todos.filter((todo) => todo.ID !== ID)

  render()
  save()

  try {
    const dirs = await paths.get()

    await fs.remove(`${dirs.data}/attachments/${ID}`, true)
  } catch {}
}

const addTag = (params: { name?: unknown; color?: unknown }) => {
  const name = typeof params?.name === "string" ? params.name.trim() : ""
  const color = typeof params?.color === "string" ? params.color : "#3b82f6"

  if (!name) return

  const existing = tags.find((tag) => tag.name.toLowerCase() === name.toLowerCase())

  if (existing) {
    app.send("tag-added", { tag: existing })
    return
  }

  const tag: Tag = { ID: newID(), name, color }

  tags = [...tags, tag]

  render()
  save()

  app.send("tag-added", { tag })
}

const pickFiles = async (params: { ID?: unknown }) => {
  const ID = typeof params?.ID === "string" ? params.ID : ""

  if (!ID) return

  let picked: string[] = []

  try {
    picked = await dialog.openFiles({ title: "Прикрепить файлы" })
  } catch {
    return
  }

  if (picked.length === 0) return

  const dirs = await paths.get()
  const target = `${dirs.data}/attachments/${ID}`
  const added: Attachment[] = []

  try {
    await fs.mkdir(target)
  } catch {}

  for (const source of picked) {
    const name = source.split(/[\\/]/).pop() ?? source
    const destination = `${target}/${Date.now()}-${name}`

    try {
      await fs.copy(source, destination)

      added.push({ name, path: destination })
    } catch {}
  }

  if (added.length === 0) return

  todos = todos.map((todo) => (todo.ID === ID ? { ...todo, files: [...todo.files, ...added] } : todo))

  render()
  save()

  app.send("task-files", { ID, files: added })
}

const removeFile = (params: { ID?: unknown; path?: unknown }) => {
  const ID = typeof params?.ID === "string" ? params.ID : ""
  const path = typeof params?.path === "string" ? params.path : ""

  if (!ID || !path) return

  todos = todos.map((todo) => {
    if (todo.ID !== ID) return todo

    return { ...todo, files: todo.files.filter((file) => file.path !== path) }
  })

  render()
  save()

  void fs.remove(path).catch(() => false)
}

const restore = async () => {
  const savedTodos = await storage.get("todos")
  const savedTags = await storage.get("tags")

  todos = (Array.isArray(savedTodos) ? savedTodos : [])
    .map(parseTodo)
    .filter((todo): todo is Todo => todo !== null)

  tags = (Array.isArray(savedTags) ? savedTags : []).map(parseTag).filter((tag): tag is Tag => tag !== null)

  render()
}

app.on("add-todo", addTodo)
app.on("save-task", saveTask)
app.on("toggle-todo", toggleTodo)
app.on("delete-todo", deleteTodo)
app.on("add-tag", addTag)
app.on("pick-files", pickFiles)
app.on("remove-file", removeFile)
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
