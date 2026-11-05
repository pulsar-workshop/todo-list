import { App, computed, createBreakpoints, createState, type ColorValue } from "pulsar"
import { DEFAULT_PORT } from "./model.ts"
import type { Folder, SyncSettings, Tag, Todo } from "./types.ts"

export const app = new App()

export const breakpoints = createBreakpoints(app)

export const state = createState({
  sync: { dirty: false },
  syncSettings: { host: "", port: DEFAULT_PORT, password: "" } as SyncSettings,
  todos: [] as Todo[],
  tags: [] as Tag[],
  folders: [] as Folder[],
  deletedTodos: {} as Record<string, number>,
  deletedFolders: {} as Record<string, number>,
  deletedTags: {} as Record<string, number>,
})

export type DateField = "draftStart" | "draftEnd" | "draftCreated" | "draftCompleted"

export const ui = createState({
  draft: null as Todo | null,
  draftStart: "",
  draftEnd: "",
  draftCreated: "",
  draftCompleted: "",
  draftDateMode: "allDay" as "allDay" | "range",
  editorOpen: false,
  editorError: "",
  syncOpen: false,
  viewerPath: "",
  todoQuery: "",
  filterTags: [] as string[],
  folderFilter: "",
  tagFilterOpen: false,
  foldersOpen: false,
  folderName: "",
  folderRenameID: "",
  folderRenameText: "",
  newTaskFocus: false,
  tagSheetOpen: false,
  tagName: "",
  tagColor: "#3b82f6",
  subtaskText: "",
  calendarOpen: false,
  calendarTarget: "" as DateField | "",
  calendarYear: 0,
  calendarMonth: 0,
  calendarWithTime: true,
  calendarHour: "",
  calendarMinute: "",
  calendarSecond: "",
  taskCalendarOpen: false,
  calendarReady: false,
  taskCalendarYear: 0,
  taskCalendarMonth: 0,
  taskCalendarDay: 0,
  subtaskEditing: "",
  themeDark: true,
  syncStatus: "off",
})

export const activeCount = computed(() => {
  return state.todos.filter((todo) => !todo.done).length
})

export const sortedTodos = computed(() => {
  return [...state.todos].sort((a, b) => b.createdAT - a.createdAT)
})

export const activeFolder = computed(() => {
  const stored = ui.folderFilter

  if (stored === "none") return stored

  return state.folders.some((folder) => folder.ID === stored) ? stored : ""
})

export const activeTags = computed(() => {
  return ui.filterTags.filter((ID) => state.tags.some((tag) => tag.ID === ID))
})

export const tagByID = (ID: string): Tag | null => {
  return state.tags.find((tag) => tag.ID === ID) ?? null
}

export const fileURL = (path: string): string => {
  if (path.startsWith("file:")) return path

  return `file://${encodeURI(path).replace(/[?#]/g, encodeURIComponent)}`
}

export const syncLabel = (): string => {
  const status = ui.syncStatus

  if (status === "ok") return "Синхронизировано"
  if (status === "error") return "Сервер недоступен"
  if (status === "idle") return "Ожидание"

  return "Синхронизация выключена"
}

export const syncColor = (): ColorValue => {
  const status = ui.syncStatus

  if (status === "ok") return "#22c55e"
  if (status === "error") return "#ef4444"

  return "subtext"
}
