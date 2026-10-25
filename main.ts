import { App, callCapability, dialog, fs, net, paths, storage } from "pulsar"

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
  key?: string
  thumb?: string
  size?: number
  modifiedAT?: number
}

type Todo = {
  ID: string
  text: string
  description: string
  done: boolean
  createdAT: number
  updatedAT: number
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
  updatedAT: number
}

type SyncSettings = {
  host: string
  port: string
  password: string
}

type RemoteState = {
  todos: Todo[]
  tags: Tag[]
  deletedTodos: string[]
  deletedTags: string[]
  files: string[]
}

const DEFAULT_PORT = "8787"

const app = new App()

const sync = { dirty: false }

let syncSettings: SyncSettings = { host: "", port: DEFAULT_PORT, password: "" }
let todos: Todo[] = []
let tags: Tag[] = []
let deletedTodos: Record<string, number> = {}
let deletedTags: Record<string, number> = {}

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

  const attachment: Attachment = { name: record.name, path: record.path }

  if (typeof record.key === "string") attachment.key = record.key
  if (typeof record.thumb === "string") attachment.thumb = record.thumb
  if (typeof record.size === "number") attachment.size = record.size
  if (typeof record.modifiedAT === "number") attachment.modifiedAT = record.modifiedAT

  return attachment
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
    updatedAT: asNumber(record.updatedAT) ?? asNumber(record.createdAT) ?? Date.now(),
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

  return {
    ID: record.ID,
    name: record.name,
    color: record.color,
    updatedAT: asNumber(record.updatedAT) ?? Date.now(),
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

const parseDeleted = (value: unknown): Record<string, number> => {
  if (!isRecord(value)) return {}

  const result: Record<string, number> = {}

  for (const [ID, at] of Object.entries(value)) {
    if (typeof at === "number" && Number.isFinite(at)) result[ID] = at
  }

  return result
}

const baseName = (path: string): string => {
  return path.split(/[\\/]/).pop() ?? path
}

const attachmentKey = (todoID: string, file: Attachment): string => {
  return file.key ?? `${todoID}/${baseName(file.path)}`
}

const VIDEO_PATTERN = /\.(mp4|m4v|mov|webm|mkv|avi|3gp)$/i

const isVideo = (name: string): boolean => {
  return VIDEO_PATTERN.test(name)
}

const thumbPath = (root: string, todoID: string, file: Attachment): string => {
  return `${root}/${todoID}/.thumb-${baseName(file.path)}.jpg`
}

const normalizeAttachments = (): boolean => {
  let changed = false

  for (const todo of todos) {
    for (const file of todo.files) {
      if (!file.key) {
        file.key = attachmentKey(todo.ID, file)
        changed = true
      }
    }
  }

  return changed
}

const syncBase = (): string => {
  if (!syncSettings.host) return ""

  return `http://${syncSettings.host}:${syncSettings.port}`
}

const persistState = async (): Promise<void> => {
  await storage.set("todos", todos)
  await storage.set("tags", tags)
  await storage.set("deletedTodos", deletedTodos)
  await storage.set("deletedTags", deletedTags)
  await storage.set("syncDirty", sync.dirty)
}

const syncHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  }

  if (syncSettings.password) headers.authorization = `Bearer ${syncSettings.password}`

  return headers
}

const setStatus = (status: string) => {
  app.store.set("syncStatus", status)
  app.store.set("syncHost", syncSettings.host)
  app.store.set("syncPort", syncSettings.port)
  app.store.set("syncPassword", syncSettings.password)
}

const parseState = (text: string): RemoteState | null => {
  let parsed: unknown

  try {
    parsed = JSON.parse(text) as unknown
  } catch {
    return null
  }

  if (!isRecord(parsed)) return null

  return {
    todos: Array.isArray(parsed.todos) ? parsed.todos.map(parseTodo).filter((todo): todo is Todo => todo !== null) : [],
    tags: Array.isArray(parsed.tags) ? parsed.tags.map(parseTag).filter((tag): tag is Tag => tag !== null) : [],
    deletedTodos: Array.isArray(parsed.deletedTodos)
      ? parsed.deletedTodos.filter((ID): ID is string => typeof ID === "string")
      : [],
    deletedTags: Array.isArray(parsed.deletedTags)
      ? parsed.deletedTags.filter((ID): ID is string => typeof ID === "string")
      : [],
    files: Array.isArray(parsed.files) ? parsed.files.filter((key): key is string => typeof key === "string") : [],
  }
}

const applyRemote = (remote: RemoteState): boolean => {
  let changed = false

  for (const ID of remote.deletedTodos) {
    if (deletedTodos[ID] !== undefined) continue

    deletedTodos = { ...deletedTodos, [ID]: Date.now() }
    changed = true
  }

  for (const ID of remote.deletedTags) {
    if (deletedTags[ID] !== undefined) continue

    deletedTags = { ...deletedTags, [ID]: Date.now() }
    changed = true
  }

  const localTodos = new Map(todos.map((todo) => [todo.ID, todo]))

  for (const todo of remote.todos) {
    const tombstoneAt = deletedTodos[todo.ID]

    if (tombstoneAt !== undefined) {
      if (todo.updatedAT <= tombstoneAt) continue

      const next = { ...deletedTodos }
      delete next[todo.ID]
      deletedTodos = next
      changed = true
    }

    const local = localTodos.get(todo.ID)

    if (!local || todo.updatedAT > local.updatedAT) {
      localTodos.set(todo.ID, todo)
      changed = true
    }
  }

  const nextTodos = [...localTodos.values()].filter((todo) => !deletedTodos[todo.ID])

  if (nextTodos.length !== todos.length) changed = true

  todos = nextTodos

  const localTags = new Map(tags.map((tag) => [tag.ID, tag]))

  for (const tag of remote.tags) {
    const tombstoneAt = deletedTags[tag.ID]

    if (tombstoneAt !== undefined) {
      if (tag.updatedAT <= tombstoneAt) continue

      const next = { ...deletedTags }
      delete next[tag.ID]
      deletedTags = next
      changed = true
    }

    const local = localTags.get(tag.ID)

    if (!local || tag.updatedAT > local.updatedAT) {
      localTags.set(tag.ID, tag)
      changed = true
    }
  }

  const nextTags = [...localTags.values()].filter((tag) => !deletedTags[tag.ID])

  if (nextTags.length !== tags.length) changed = true

  tags = nextTags

  if (normalizeAttachments()) changed = true

  return changed
}

const attachmentRoot = async (): Promise<string> => {
  const dirs = await paths.get()

  return `${dirs.data}/attachments`
}

const ensureThumb = async (base: string, root: string, todo: Todo, file: Attachment): Promise<boolean> => {
  if (!isVideo(file.name)) return false

  const local = thumbPath(root, todo.ID, file)

  try {
    if (file.thumb && (await fs.exists(file.thumb))) return false

    if (await fs.exists(local)) {
      file.thumb = local

      return true
    }

    const key = attachmentKey(todo.ID, file)
    const url = `${base}/file?key=${encodeURIComponent(`thumb:${key}`)}`
    const response = await net.fetch(url, { headers: syncHeaders(), timeoutMs: 10000 })

    if (response.status !== 200) return false

    const parsed = JSON.parse(response.text) as unknown

    if (!isRecord(parsed) || typeof parsed.data !== "string") return false

    await fs.mkdir(`${root}/${todo.ID}`)
    await fs.writeFile(local, parsed.data, "base64")

    file.thumb = local

    return true
  } catch {
    return false
  }
}

const uploadFiles = async (base: string, serverFiles: string[]): Promise<boolean> => {
  const known = new Set(serverFiles)
  const root = await attachmentRoot()

  let changed = false

  for (const todo of todos) {
    for (const file of todo.files) {
      const key = attachmentKey(todo.ID, file)

      if (!file.key) {
        file.key = key
        changed = true
      }

      if (!known.has(key)) {
        try {
          if (await fs.exists(file.path)) {
            const data = await fs.readFile(file.path, "base64")
            const url = `${base}/file?key=${encodeURIComponent(key)}`

            await net.fetch(url, {
              method: "PUT",
              headers: syncHeaders(),
              body: JSON.stringify({ data }),
              timeoutMs: 10000,
            })
          }
        } catch {}
      }

      if (await ensureThumb(base, root, todo, file)) changed = true
    }
  }

  return changed
}

const downloadFiles = async (base: string, serverFiles: string[]): Promise<boolean> => {
  const known = new Set(serverFiles)
  const root = await attachmentRoot()

  let changed = false

  for (const todo of todos) {
    for (const file of todo.files) {
      const key = attachmentKey(todo.ID, file)

      if (!file.key) {
        file.key = key
        changed = true
      }

      if (known.has(key) && !(await fs.exists(file.path).catch(() => true))) {
        try {
          const destination = `${root}/${todo.ID}/${baseName(file.path)}`
          const url = `${base}/file?key=${encodeURIComponent(key)}`
          const response = await net.fetch(url, {
            headers: syncHeaders(),
            timeoutMs: 10000,
          })

          if (response.status === 200) {
            const parsed = JSON.parse(response.text) as unknown

            if (isRecord(parsed) && typeof parsed.data === "string") {
              await fs.mkdir(`${root}/${todo.ID}`)
              await fs.writeFile(destination, parsed.data, "base64")

              file.path = destination

              try {
                const info = await fs.stat(destination)

                file.size = info.size
              } catch {}

              changed = true
            }
          }
        } catch {}
      }

      if (known.has(key) && (await ensureThumb(base, root, todo, file))) changed = true
    }
  }

  return changed
}

const deleteRemoteFile = async (key: string): Promise<void> => {
  const base = syncBase()

  if (!base || !key) return

  try {
    await net.fetch(`${base}/file?key=${encodeURIComponent(key)}`, {
      method: "DELETE",
      headers: syncHeaders(),
      timeoutMs: 5000,
    })
  } catch {}
}

const push = async () => {
  const base = syncBase()

  if (!base) {
    setStatus("off")
    return
  }

  sync.dirty = true

  try {
    const response = await net.fetch(`${base}/state`, {
      method: "POST",
      headers: syncHeaders(),
      body: JSON.stringify({
        todos,
        tags,
        deletedTodos,
        deletedTags,
      }),
      timeoutMs: 5000,
    })

    if (response.status < 200 || response.status >= 300) throw new Error(`sync failed: ${response.status}`)

    const remote = parseState(response.text)

    let changed = remote ? applyRemote(remote) : false

    if (await uploadFiles(base, remote?.files ?? [])) changed = true

    sync.dirty = false
    void storage.set("syncDirty", false)

    if (changed) render()

    void persistState()
    setStatus("ok")
  } catch {
    setStatus("error")
  }
}

const pull = async () => {
  const base = syncBase()

  if (!base || sync.dirty) return

  try {
    const response = await net.fetch(`${base}/state`, {
      headers: syncHeaders(),
      timeoutMs: 5000,
    })

    if (response.status < 200 || response.status >= 300) throw new Error(`sync failed: ${response.status}`)

    const remote = parseState(response.text)

    setStatus("ok")

    if (!remote) return

    let changed = applyRemote(remote)

    if (await downloadFiles(base, remote.files)) changed = true

    if (changed) render()

    if (changed) void persistState()
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

  if (host) await push()
}

const render = () => {
  app.store.set("todos", todos)
  app.store.set("tags", tags)
  app.store.set("activeCount", todos.filter((todo) => !todo.done).length)
}

const save = () => {
  sync.dirty = true
  void storage.set("syncDirty", true)
  void persistState()
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
      updatedAT: Date.now(),
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
  if (deletedTodos[task.ID]) return

  task.updatedAT = Date.now()

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
      updatedAT: Date.now(),
      completedAT: done ? Date.now() : null,
    }
  })

  render()
  save()
}

const deleteTodo = async (params: { ID?: unknown }) => {
  const ID = typeof params?.ID === "string" ? params.ID : ""

  if (!ID) return

  deletedTodos = { ...deletedTodos, [ID]: Date.now() }
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

  const tag: Tag = { ID: newID(), name, color, updatedAT: Date.now() }

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

      let size: number | undefined
      let modifiedAT: number | undefined

      try {
        const info = await fs.stat(destination)

        size = info.size
        modifiedAT = info.mtimeMs
      } catch {}

      const attachment: Attachment = {
        name,
        path: destination,
        key: `${ID}/${baseName(destination)}`,
      }

      if (size !== undefined) attachment.size = size
      if (modifiedAT !== undefined) attachment.modifiedAT = modifiedAT

      added.push(attachment)
    } catch {}
  }

  if (added.length === 0) return

  todos = todos.map((todo) =>
    todo.ID === ID ? { ...todo, updatedAT: Date.now(), files: [...todo.files, ...added] } : todo,
  )

  render()
  save()

  app.send("task-files", { ID, files: added })
}

const removeFile = (params: { ID?: unknown; path?: unknown }) => {
  const ID = typeof params?.ID === "string" ? params.ID : ""
  const path = typeof params?.path === "string" ? params.path : ""

  if (!ID || !path) return

  const target = todos.find((todo) => todo.ID === ID)
  const file = target?.files.find((item) => item.path === path)
  const key = file ? attachmentKey(ID, file) : ""

  todos = todos.map((todo) => {
    if (todo.ID !== ID) return todo

    return {
      ...todo,
      updatedAT: Date.now(),
      files: todo.files.filter((item) => item.path !== path),
    }
  })

  render()
  save()

  void fs.remove(path).catch(() => false)
  void deleteRemoteFile(key)
}

const restore = async () => {
  const savedTodos = await storage.get("todos")
  const savedTags = await storage.get("tags")
  const savedDeletedTodos = await storage.get("deletedTodos")
  const savedDeletedTags = await storage.get("deletedTags")
  const savedDirty = await storage.get("syncDirty")

  deletedTodos = parseDeleted(savedDeletedTodos)
  deletedTags = parseDeleted(savedDeletedTags)
  sync.dirty = savedDirty === true

  todos = (Array.isArray(savedTodos) ? savedTodos : [])
    .map(parseTodo)
    .filter((todo): todo is Todo => todo !== null)
    .filter((todo) => !deletedTodos[todo.ID])

  tags = (Array.isArray(savedTags) ? savedTags : [])
    .map(parseTag)
    .filter((tag): tag is Tag => tag !== null)
    .filter((tag) => !deletedTags[tag.ID])

  normalizeAttachments()
  render()
}

app.on("add-todo", addTodo)
app.on("save-task", saveTask)
app.on("toggle-todo", toggleTodo)
app.on("delete-todo", deleteTodo)
app.on("add-tag", addTag)
app.on("pick-files", pickFiles)
app.on("remove-file", removeFile)
app.on("export-file", async (params: { path?: unknown; name?: unknown }) => {
  const path = typeof params?.path === "string" ? params.path : ""
  const name = typeof params?.name === "string" ? params.name : ""

  if (!path) return

  try {
    const ok = await callCapability("fs.exportTo", { path, name })

    if (ok) await callCapability("dialog.toast", { text: "Скачано" })
  } catch {}
})
app.on("open-file", async (params: { path?: unknown }) => {
  const path = typeof params?.path === "string" ? params.path : ""

  if (!path) return

  try {
    await callCapability("fs.open", { path })

    return
  } catch {}

  if (typeof Bun === "undefined" || typeof process === "undefined") return

  if (process.platform === "linux" && isVideo(path)) {
    try {
      Bun.spawn(["mpv", "--fs", "--force-window=yes", path], { stdout: "ignore", stderr: "ignore" })

      return
    } catch {}
  }

  const command =
    process.platform === "darwin"
      ? ["open", path]
      : process.platform === "win32"
        ? ["cmd", "/c", "start", "", path]
        : ["xdg-open", path]

  try {
    Bun.spawn(command, { stdout: "ignore", stderr: "ignore" })
  } catch {}
})
app.on("save-sync", saveSync)
app.on("back-pressed", () => {
  app.send("back-pressed", {})
})

const start = async () => {
  await loadSync()
  await restore()

  if (sync.dirty) await push()
  else await pull()

  app.run()

  setInterval(() => {
    if (!syncSettings.host) return

    if (sync.dirty) void push()
    else void pull()
  }, 4000)
}

void start()
