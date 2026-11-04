import { secureStorage, storage } from "pulsar"
import {
  DEFAULT_PORT,
  normalizeAttachments,
  parseDeleted,
  parseFolder,
  parseTag,
  parseTodo,
} from "./model.ts"
import { state } from "./state.ts"
import { setStatus } from "./sync-status.ts"
import type { Folder, SyncSettings, Tag, Todo } from "./types.ts"

const PERSIST_DELAY_MS = 200
const SECRET_KEY = "syncPassword"

let persistTimer: ReturnType<typeof setTimeout> | null = null

export const flushState = async (): Promise<void> => {
  if (persistTimer !== null) clearTimeout(persistTimer)

  persistTimer = null

  await storage.setMany({
    todos: state.todos,
    tags: state.tags,
    folders: state.folders,
    deletedTodos: state.deletedTodos,
    deletedTags: state.deletedTags,
    deletedFolders: state.deletedFolders,
    syncDirty: state.sync.dirty,
  })
}

export const persistState = (): void => {
  if (persistTimer !== null) return

  persistTimer = setTimeout(() => void flushState(), PERSIST_DELAY_MS)
}

export const restore = async (): Promise<void> => {
  const savedTodos = await storage.get("todos")
  const savedTags = await storage.get("tags")
  const savedFolders = await storage.get("folders")
  const savedDeletedTodos = await storage.get("deletedTodos")
  const savedDeletedTags = await storage.get("deletedTags")
  const savedDeletedFolders = await storage.get("deletedFolders")
  const savedDirty = await storage.get("syncDirty")

  state.deletedTodos = parseDeleted(savedDeletedTodos)
  state.deletedTags = parseDeleted(savedDeletedTags)
  state.deletedFolders = parseDeleted(savedDeletedFolders)
  state.sync.dirty = savedDirty === true

  state.todos = (Array.isArray(savedTodos) ? savedTodos : [])
    .map(parseTodo)
    .filter((todo): todo is Todo => todo !== null)
    .filter((todo) => !state.deletedTodos[todo.ID])

  state.tags = (Array.isArray(savedTags) ? savedTags : [])
    .map(parseTag)
    .filter((tag): tag is Tag => tag !== null)
    .filter((tag) => !state.deletedTags[tag.ID])

  state.folders = (Array.isArray(savedFolders) ? savedFolders : [])
    .map(parseFolder)
    .filter((folder): folder is Folder => folder !== null)
    .filter((folder) => !state.deletedFolders[folder.ID])

  normalizeAttachments(state.todos)
}

const secureAvailable = async (): Promise<boolean> => {
  try {
    return (await secureStorage.available()) === true
  } catch {
    return false
  }
}

const savePassword = async (password: string): Promise<boolean> => {
  if (!(await secureAvailable())) return false

  if (!password) {
    await secureStorage.remove(SECRET_KEY)

    return true
  }

  return (await secureStorage.set(SECRET_KEY, password)) === true
}

const saveConnection = async (settings: SyncSettings): Promise<void> => {
  const secured = await savePassword(settings.password)

  await storage.set(
    "sync",
    secured ? { host: settings.host, port: settings.port } : settings,
  )
}

export const loadSyncSettings = async (): Promise<void> => {
  const saved = await storage.get("sync")

  if (typeof saved === "object" && saved !== null) {
    const record = saved as Record<string, unknown>
    const host = typeof record.host === "string" ? record.host : ""
    const port = typeof record.port === "string" ? record.port : DEFAULT_PORT
    const stored = typeof record.password === "string" ? record.password : ""
    const secret = (await secureAvailable()) ? await secureStorage.get(SECRET_KEY) : null
    const password = secret ?? stored

    state.syncSettings = { host, port, password }

    if (stored) await saveConnection(state.syncSettings)
  }

  setStatus(state.syncSettings.host ? "idle" : "off")
}

export const writeSyncSettings = async (
  settings: SyncSettings,
): Promise<void> => {
  state.syncSettings = settings

  await saveConnection(settings)
}
