import { App, createBreakpoints, type ColorValue } from "pulsar"
import { DEFAULT_PORT } from "./model.ts"
import type { Folder, SyncSettings, Tag, Todo } from "./types.ts"

export const app = new App()

export const breakpoints = createBreakpoints(app)


export const state = {
  sync: { dirty: false },
  syncSettings: { host: "", port: DEFAULT_PORT, password: "" } as SyncSettings,
  todos: [] as Todo[],
  tags: [] as Tag[],
  folders: [] as Folder[],
  deletedTodos: {} as Record<string, number>,
  deletedFolders: {} as Record<string, number>,
  deletedTags: {} as Record<string, number>,
}

export const refresh = (): void => {
  app.store.set("todos", state.todos)
  app.store.set("tags", state.tags)
  app.store.set("folders", state.folders)
  app.store.set("activeCount", state.todos.filter((todo) => !todo.done).length)
}

export const uiValue = <T>(key: string, fallback: T): T => {
  const value = app.store.get(key)

  return value === null || value === undefined ? fallback : (value as T)
}

export const setUI = (key: string, value: unknown): void => {
  app.store.set(key, value)
}

export const getDraft = (): Todo | null => {
  return uiValue<Todo | null>("draft", null)
}

export const tagByID = (ID: string): Tag | null => {
  return state.tags.find((tag) => tag.ID === ID) ?? null
}

export const fileURL = (path: string): string => {
  return path.startsWith("file:") ? path : `file://${path}`
}

export const syncLabel = (): string => {
  const status = app.store.get("syncStatus") ?? "off"

  if (status === "ok") return "Синхронизировано"
  if (status === "error") return "Сервер недоступен"
  if (status === "idle") return "Ожидание"

  return "Синхронизация выключена"
}

export const syncColor = (): ColorValue => {
  const status = app.store.get("syncStatus") ?? "off"

  if (status === "ok") return "#22c55e"
  if (status === "error") return "#ef4444"

  return "subtext"
}
