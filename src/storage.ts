import { storage } from "pulsar"
import {
  DEFAULT_PORT,
  normalizeAttachments,
  parseDeleted,
  parseTag,
  parseTodo,
} from "./model.ts"
import { refresh, state } from "./state.ts"
import { setStatus } from "./sync-status.ts"
import type { SyncSettings, Tag, Todo } from "./types.ts"

export const persistState = async (): Promise<void> => {
  await storage.set("todos", state.todos)
  await storage.set("tags", state.tags)
  await storage.set("deletedTodos", state.deletedTodos)
  await storage.set("deletedTags", state.deletedTags)
  await storage.set("syncDirty", state.sync.dirty)
}

export const restore = async (): Promise<void> => {
  const savedTodos = await storage.get("todos")
  const savedTags = await storage.get("tags")
  const savedDeletedTodos = await storage.get("deletedTodos")
  const savedDeletedTags = await storage.get("deletedTags")
  const savedDirty = await storage.get("syncDirty")

  state.deletedTodos = parseDeleted(savedDeletedTodos)
  state.deletedTags = parseDeleted(savedDeletedTags)
  state.sync.dirty = savedDirty === true

  state.todos = (Array.isArray(savedTodos) ? savedTodos : [])
    .map(parseTodo)
    .filter((todo): todo is Todo => todo !== null)
    .filter((todo) => !state.deletedTodos[todo.ID])

  state.tags = (Array.isArray(savedTags) ? savedTags : [])
    .map(parseTag)
    .filter((tag): tag is Tag => tag !== null)
    .filter((tag) => !state.deletedTags[tag.ID])

  normalizeAttachments(state.todos)
  refresh()
}

export const loadSyncSettings = async (): Promise<void> => {
  const saved = await storage.get("sync")

  if (typeof saved === "object" && saved !== null) {
    const record = saved as Record<string, unknown>
    const host = typeof record.host === "string" ? record.host : ""
    const port = typeof record.port === "string" ? record.port : DEFAULT_PORT
    const password = typeof record.password === "string" ? record.password : ""

    state.syncSettings = { host, port, password }
  }

  setStatus(state.syncSettings.host ? "idle" : "off")
}

export const writeSyncSettings = async (
  settings: SyncSettings,
): Promise<void> => {
  state.syncSettings = settings
  await storage.set("sync", settings)
}
