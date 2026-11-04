import { NetError, fs, net, paths } from "pulsar"
import {
  attachmentKey,
  baseName,
  DEFAULT_PORT,
  isRecord,
  isVideo,
  normalizeAttachments,
  parseFolder,
  parseTag,
  parseTodo,
  thumbPath,
} from "./model.ts"
import { persistState, writeSyncSettings } from "./storage.ts"
import { state } from "./state.ts"
import { setStatus } from "./sync-status.ts"
import type {
  Attachment,
  Folder,
  RemoteState,
  SyncSettings,
  Tag,
  Todo,
} from "./types.ts"

let revision = 0
let pushing: Promise<void> | null = null
let pushQueued = false
let pulling = false

const failedDownloads = new Set<string>()

export const markDirty = (): void => {
  state.sync.dirty = true
  revision++
}

const syncBase = (): string => {
  if (!state.syncSettings.host) return ""

  return `http://${state.syncSettings.host}:${state.syncSettings.port}`
}

const syncHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  }

  if (state.syncSettings.password)
    headers.authorization = `Bearer ${state.syncSettings.password}`

  return headers
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
    todos: Array.isArray(parsed.todos)
      ? parsed.todos
          .map(parseTodo)
          .filter((todo): todo is Todo => todo !== null)
      : [],
    tags: Array.isArray(parsed.tags)
      ? parsed.tags.map(parseTag).filter((tag): tag is Tag => tag !== null)
      : [],
    folders: Array.isArray(parsed.folders)
      ? parsed.folders
          .map(parseFolder)
          .filter((folder): folder is Folder => folder !== null)
      : [],
    deletedTodos: Array.isArray(parsed.deletedTodos)
      ? parsed.deletedTodos.filter((ID): ID is string => typeof ID === "string")
      : [],
    deletedTags: Array.isArray(parsed.deletedTags)
      ? parsed.deletedTags.filter((ID): ID is string => typeof ID === "string")
      : [],
    deletedFolders: Array.isArray(parsed.deletedFolders)
      ? parsed.deletedFolders.filter((ID): ID is string => typeof ID === "string")
      : [],
    files: Array.isArray(parsed.files)
      ? parsed.files.filter((key): key is string => typeof key === "string")
      : [],
  }
}

const publishFileChanges = (): void => {
  state.todos = state.todos.map((todo) => ({ ...todo }))
}

const applyRemote = (remote: RemoteState): boolean => {
  let changed = false

  for (const ID of remote.deletedTodos) {
    if (state.deletedTodos[ID] !== undefined) continue

    state.deletedTodos = { ...state.deletedTodos, [ID]: Date.now() }
    changed = true
  }

  for (const ID of remote.deletedTags) {
    if (state.deletedTags[ID] !== undefined) continue

    state.deletedTags = { ...state.deletedTags, [ID]: Date.now() }
    changed = true
  }

  for (const ID of remote.deletedFolders) {
    if (state.deletedFolders[ID] !== undefined) continue

    state.deletedFolders = { ...state.deletedFolders, [ID]: Date.now() }
    changed = true
  }

  const localTodos = new Map(state.todos.map((todo) => [todo.ID, todo]))

  let todosChanged = false

  for (const todo of remote.todos) {
    const tombstoneAt = state.deletedTodos[todo.ID]

    if (tombstoneAt !== undefined) {
      if (todo.updatedAT <= tombstoneAt) continue

      const next = { ...state.deletedTodos }
      delete next[todo.ID]
      state.deletedTodos = next
      changed = true
    }

    const local = localTodos.get(todo.ID)

    if (!local || todo.updatedAT > local.updatedAT) {
      localTodos.set(todo.ID, todo)
      todosChanged = true
    }
  }

  const nextTodos = [...localTodos.values()].filter(
    (todo) => !state.deletedTodos[todo.ID],
  )

  if (todosChanged || nextTodos.length !== state.todos.length) {
    state.todos = nextTodos
    changed = true
  }

  const localTags = new Map(state.tags.map((tag) => [tag.ID, tag]))

  let tagsChanged = false

  for (const tag of remote.tags) {
    const tombstoneAt = state.deletedTags[tag.ID]

    if (tombstoneAt !== undefined) {
      if (tag.updatedAT <= tombstoneAt) continue

      const next = { ...state.deletedTags }
      delete next[tag.ID]
      state.deletedTags = next
      changed = true
    }

    const local = localTags.get(tag.ID)

    if (!local || tag.updatedAT > local.updatedAT) {
      localTags.set(tag.ID, tag)
      tagsChanged = true
    }
  }

  const nextTags = [...localTags.values()].filter(
    (tag) => !state.deletedTags[tag.ID],
  )

  if (tagsChanged || nextTags.length !== state.tags.length) {
    state.tags = nextTags
    changed = true
  }

  const localFolders = new Map(state.folders.map((folder) => [folder.ID, folder]))

  let foldersChanged = false

  for (const folder of remote.folders) {
    const tombstoneAt = state.deletedFolders[folder.ID]

    if (tombstoneAt !== undefined) {
      if (folder.updatedAT <= tombstoneAt) continue

      const next = { ...state.deletedFolders }
      delete next[folder.ID]
      state.deletedFolders = next
      changed = true
    }

    const local = localFolders.get(folder.ID)

    if (!local || folder.updatedAT > local.updatedAT) {
      localFolders.set(folder.ID, folder)
      foldersChanged = true
    }
  }

  const nextFolders = [...localFolders.values()].filter(
    (folder) => !state.deletedFolders[folder.ID],
  )

  if (foldersChanged || nextFolders.length !== state.folders.length) {
    state.folders = nextFolders
    changed = true
  }

  const folderIDs = new Set(state.folders.map((folder) => folder.ID))

  if (state.todos.some((todo) => todo.folderID && !folderIDs.has(todo.folderID))) {
    state.todos = state.todos.map((todo) => {
      if (!todo.folderID || folderIDs.has(todo.folderID)) return todo

      return { ...todo, folderID: null, updatedAT: Date.now() }
    })
    changed = true
  }

  if (normalizeAttachments(state.todos)) {
    publishFileChanges()
    changed = true
  }

  return changed
}

const attachmentRoot = async (): Promise<string> => {
  const dirs = await paths.get()

  return `${dirs.data}/attachments`
}

const ensureThumb = async (
  base: string,
  root: string,
  todo: Todo,
  file: Attachment,
): Promise<boolean> => {
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
    const response = await net.fetch(url, {
      headers: syncHeaders(),
      timeoutMs: 10000,
    })

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

const uploadFiles = async (
  base: string,
  serverFiles: string[],
): Promise<boolean> => {
  const known = new Set(serverFiles)
  const root = await attachmentRoot()

  let changed = false

  for (const todo of state.todos) {
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

const downloadFiles = async (
  base: string,
  serverFiles: string[],
): Promise<boolean> => {
  const known = new Set(serverFiles)
  const root = await attachmentRoot()

  let changed = false

  for (const todo of state.todos) {
    for (const file of todo.files) {
      const key = attachmentKey(todo.ID, file)

      if (!file.key) {
        file.key = key
        changed = true
      }

      if (
        known.has(key) &&
        !failedDownloads.has(key) &&
        !(await fs.exists(file.path).catch(() => true))
      ) {
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
        } catch (error) {
          if (error instanceof NetError && error.code === "ERR_TOO_LARGE")
            failedDownloads.add(key)
        }
      }

      if (known.has(key) && (await ensureThumb(base, root, todo, file)))
        changed = true
    }
  }

  return changed
}

export const deleteRemoteFile = async (key: string): Promise<void> => {
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

const pushOnce = async (base: string): Promise<boolean> => {
  const started = revision

  state.sync.dirty = true

  try {
    const response = await net.fetch(`${base}/state`, {
      method: "POST",
      headers: syncHeaders(),
      body: JSON.stringify({
        todos: state.todos,
        tags: state.tags,
        folders: state.folders,
        deletedTodos: state.deletedTodos,
        deletedTags: state.deletedTags,
        deletedFolders: state.deletedFolders,
      }),
      timeoutMs: 5000,
    })

    if (response.status < 200 || response.status >= 300)
      throw new Error(`sync failed: ${response.status}`)

    const remote = parseState(response.text)

    if (remote) applyRemote(remote)

    if (await uploadFiles(base, remote?.files ?? [])) publishFileChanges()

    state.sync.dirty = revision !== started
    persistState()
    setStatus("ok")

    return true
  } catch {
    setStatus("error")

    return false
  }
}

const runPushes = async (): Promise<void> => {
  let succeeded = true

  do {
    pushQueued = false

    const base = syncBase()

    if (!base) {
      setStatus("off")

      return
    }

    succeeded = await pushOnce(base)
  } while (pushQueued && succeeded)
}

export const push = (): Promise<void> => {
  if (pushing) {
    pushQueued = true

    return pushing
  }

  pushing = runPushes().finally(() => {
    pushing = null
  })

  return pushing
}

export const pull = async (): Promise<void> => {
  const base = syncBase()

  if (!base || state.sync.dirty || pushing || pulling) return

  pulling = true

  try {
    const response = await net.fetch(`${base}/state`, {
      headers: syncHeaders(),
      timeoutMs: 5000,
    })

    if (response.status < 200 || response.status >= 300)
      throw new Error(`sync failed: ${response.status}`)

    const remote = parseState(response.text)

    setStatus("ok")

    if (!remote) return

    const applied = applyRemote(remote)
    const downloaded = await downloadFiles(base, remote.files)

    if (downloaded) publishFileChanges()
    if (applied || downloaded) persistState()
  } catch {
    setStatus("error")
  } finally {
    pulling = false
  }
}

export const syncNow = async (): Promise<void> => {
  if (!state.syncSettings.host) return

  if (state.sync.dirty) await push()
  else await pull()
}

export const saveSyncConnection = async (params: {
  host?: unknown
  port?: unknown
  password?: unknown
}): Promise<void> => {
  const host = typeof params?.host === "string" ? params.host.trim() : ""
  const port = typeof params?.port === "string" ? params.port.trim() : ""
  const password = typeof params?.password === "string" ? params.password : ""

  const settings: SyncSettings = { host, port: port || DEFAULT_PORT, password }

  await writeSyncSettings(settings)

  failedDownloads.clear()
  setStatus(host ? "idle" : "off")

  if (host) await push()
}
