import { clipboard, dialog, share } from "pulsar"
import {
  addFolder,
  addTag,
  deleteTodo,
  openPath,
  pickFiles,
  removeFile,
  renameFolder,
  saveTask,
} from "../actions.ts"
import { formatDateValue, parseTime, isDateOnly } from "../format.ts"
import { isImage, newID, todoAsText } from "../model.ts"
import { activeTags, app, state, ui, type DateField } from "../state.ts"
import { flushState } from "../storage.ts"
import type { Attachment, Folder, Subtask, Todo } from "../types.ts"
import { tr } from "../i18n.ts"

export const TAG_PALETTE = [
  "#ef4444",
  "#f59e0b",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#64748b",
]

export const openEditor = (todo: Todo): void => {
  const draft = JSON.parse(JSON.stringify(todo)) as Todo

  removedDraftFiles.clear()

  ui.draft = draft
  ui.draftStart = formatDateValue(draft.startAT, draft.startAllDay)
  ui.draftEnd = formatDateValue(draft.endAT, draft.endAllDay)
  ui.draftCreated = formatDateValue(draft.createdAT, draft.createdAllDay)
  ui.draftCompleted = formatDateValue(draft.completedAT, draft.completedAllDay)

  const timed =
    (draft.startAT !== null && !draft.startAllDay) ||
    (draft.endAT !== null && !draft.endAllDay)
  const hasRange = draft.startAT !== null && draft.endAT !== null
  const mode = timed || hasRange ? "range" : "allDay"

  ui.draftDateMode = mode

  if (mode === "allDay" && draft.startAT !== null && draft.endAT === null)
    ui.draftEnd = formatDateValue(draft.startAT, draft.startAllDay)

  ui.tagName = ""
  ui.tagColor = TAG_PALETTE[3]!
  ui.subtaskText = ""
  ui.editorError = ""
  ui.editorOpen = true
}

export const closeEditor = (): void => {
  ui.viewerPath = ""
  ui.editorOpen = false
  ui.draft = null
  ui.editorError = ""
}

const dateParts = (value: string): { day: number; month: number; year: number } | null => {
  const match = /^(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(value.trim())

  if (!match) return null

  return {
    day: Number(match[1]),
    month: Number(match[2]),
    year: Number(match[3]),
  }
}

export const createFolder = (): void => {
  const name = ui.folderName.trim()

  if (!name) return

  const folder = addFolder({ name })

  ui.folderName = ""

  if (folder) ui.folderFilter = folder.ID
}

export const openFolders = (): void => {
  ui.folderName = ""
  ui.folderRenameID = ""
  ui.foldersOpen = true
}

export const closeFolders = (): void => {
  ui.foldersOpen = false
  ui.folderRenameID = ""
}

export const startRenameFolder = (folder: Folder): void => {
  ui.folderRenameID = folder.ID
  ui.folderRenameText = folder.name
}

export const cancelRenameFolder = (): void => {
  ui.folderRenameID = ""
  ui.folderRenameText = ""
}

export const confirmRenameFolder = (): void => {
  const ID = ui.folderRenameID
  const name = ui.folderRenameText.trim()

  if (!ID || !name) return

  renameFolder({ ID, name })
  cancelRenameFolder()
}

export const openTagFilter = (): void => {
  ui.tagFilterOpen = true
}

export const closeTagFilter = (): void => {
  ui.tagFilterOpen = false
}

export const clearTagFilters = (): void => {
  ui.filterTags = []
}

export const openTagSheet = (): void => {
  ui.tagSheetOpen = true
}

export const closeTagSheet = (): void => {
  ui.tagSheetOpen = false
}

export const toggleFilterTag = (ID: string): void => {
  const active = activeTags.get()

  ui.filterTags = active.includes(ID) ? active.filter((item) => item !== ID) : [...active, ID]
}

export const clearTodoFilters = (): void => {
  ui.todoQuery = ""
  ui.filterTags = []
  ui.folderFilter = ""
}

export const openCalendar = (target: DateField, withTime = true): void => {
  const value = ui[target]
  const parts = dateParts(value)
  const time = /(\d{1,2}):(\d{1,2}):(\d{1,2})/.exec(value)
  const now = new Date()

  ui.calendarTarget = target
  ui.calendarYear = parts?.year ?? now.getFullYear()
  ui.calendarMonth = parts ? parts.month - 1 : now.getMonth()
  ui.calendarWithTime = withTime
  ui.calendarHour = withTime && time ? String(Number(time[1])).padStart(2, "0") : ""
  ui.calendarMinute = withTime && time ? String(Number(time[2])).padStart(2, "0") : ""
  ui.calendarSecond = withTime && time ? String(Number(time[3])).padStart(2, "0") : ""
  ui.calendarOpen = true
}

export const closeCalendar = (): void => {
  ui.calendarOpen = false
}

export const shiftCalendar = (delta: number): void => {
  const year = ui.calendarYear
  const month = ui.calendarMonth
  const next = new Date(year, month + delta, 1)

  ui.calendarYear = next.getFullYear()
  ui.calendarMonth = next.getMonth()
}

export const shiftCalendarYear = (delta: number): void => {
  const year = ui.calendarYear

  ui.calendarYear = year + delta
}

export const setDraftDateMode = (mode: "allDay" | "range"): void => {
  ui.draftDateMode = mode

  if (mode !== "allDay") return

  const start = ui.draftStart
  const end = ui.draftEnd

  if (!end && start) ui.draftEnd = start
}

export const pickCalendarDay = (day: number): void => {
  const target = ui.calendarTarget

  if (!target) return

  const year = ui.calendarYear
  const month = ui.calendarMonth
  const rawHour = ui.calendarHour.trim()
  const rawMinute = ui.calendarMinute.trim()
  const rawSecond = ui.calendarSecond.trim()
  const date = `${String(day).padStart(2, "0")}.${String(month + 1).padStart(2, "0")}.${year}`
  const pad = (value: string, max: number) =>
    String(Math.min(Number(value) || 0, max)).padStart(2, "0")

  ui[target] = rawHour
    ? `${date} ${pad(rawHour, 23)}:${pad(rawMinute, 59)}:${pad(rawSecond, 59)}`
    : date
  closeCalendar()
}

export const pickCalendarToday = (): void => {
  const now = new Date()

  ui.calendarYear = now.getFullYear()
  ui.calendarMonth = now.getMonth()
  pickCalendarDay(now.getDate())
}

export const updateDraft = (patch: Partial<Todo>): void => {
  const draft = ui.draft

  if (!draft) return

  ui.draft = { ...draft, ...patch }
}

export const saveDraft = (): void => {
  const draft = ui.draft

  if (!draft) return

  const mode = ui.draftDateMode
  const startText = ui.draftStart
  const endText = ui.draftEnd
  const dayText = (endText.trim() ? endText : startText).trim().split(/\s+/)[0] ?? ""

  const startAT = mode === "allDay" ? null : parseTime(startText)
  const endAT = parseTime(mode === "allDay" ? dayText : endText)
  const createdAT = parseTime(ui.draftCreated)
  const completedAT = parseTime(ui.draftCompleted)

  if (
    startAT === undefined ||
    endAT === undefined ||
    createdAT === undefined ||
    completedAT === undefined
  ) {
    ui.editorError = tr("Дата: ДД.ММ.ГГГГ, время: ЧЧ:ММ:СС (время можно не указывать)")
    return
  }

  const text = draft.text.trim()

  if (!text) {
    ui.editorError = tr("Название не может быть пустым")
    return
  }

  const next: Todo = {
    ...draft,
    text,
    startAT,
    endAT,
    startAllDay: mode === "range" && isDateOnly(startText),
    endAllDay: mode === "allDay" ? endAT !== null : isDateOnly(endText),
    completedAT,
    completedAllDay: isDateOnly(ui.draftCompleted),
  }

  if (createdAT !== null) {
    next.createdAT = createdAT
    next.createdAllDay = isDateOnly(ui.draftCreated)
  }

  saveTask({ task: next })
  closeEditor()
}

export const deleteDraft = async (): Promise<void> => {
  const draft = ui.draft

  if (!draft) return

  const ok = await dialog.message({
    title: tr("Удалить задачу?"),
    text: tr("Задачу нельзя будет восстановить."),
  })

  if (!ok) return

  await deleteTodo({ ID: draft.ID })
  closeEditor()
}

export const toggleDraftTag = (ID: string): void => {
  const draft = ui.draft

  if (!draft) return

  const tags = draft.tags.includes(ID)
    ? draft.tags.filter((tagID) => tagID !== ID)
    : [...draft.tags, ID]

  updateDraft({ tags })
}

export const pickCustomTagColor = async (): Promise<void> => {
  const current = ui.tagColor
  const picked = await dialog.color({ title: tr("Цвет тега"), color: current })

  if (picked) ui.tagColor = picked
}

export const createDraftTag = (): void => {
  const name = ui.tagName.trim()
  const color = ui.tagColor
  const draft = ui.draft

  if (!name || !draft) return

  const tag = addTag({ name, color })

  if (!tag) return

  if (!draft.tags.includes(tag.ID))
    updateDraft({ tags: [...draft.tags, tag.ID] })

  ui.tagName = ""
}

export const addDraftSubtask = (): void => {
  const draft = ui.draft
  const text = ui.subtaskText.trim()

  if (!draft || !text) return

  const subtask: Subtask = {
    ID: newID(),
    text,
    done: false,
    createdAT: Date.now(),
    completedAT: null,
  }

  updateDraft({ subtasks: [...draft.subtasks, subtask] })
  ui.subtaskText = ""
}

export const updateDraftSubtask = (
  index: number,
  patch: Partial<Subtask>,
): void => {
  const draft = ui.draft

  if (!draft) return

  updateDraft({
    subtasks: draft.subtasks.map((subtask, position) =>
      position === index ? { ...subtask, ...patch } : subtask,
    ),
  })
}

export const removeDraftSubtask = (index: number): void => {
  const draft = ui.draft

  if (!draft) return

  updateDraft({
    subtasks: draft.subtasks.filter((_subtask, position) => position !== index),
  })
}

const fileID = (file: Attachment): string => file.key ?? file.path

export const attachDraftFiles = async (): Promise<void> => {
  const draft = ui.draft

  if (!draft) return

  const added = await pickFiles({ ID: draft.ID })

  if (added.length === 0) return

  const current = ui.draft

  if (!current) return

  // The picker also adds the files to the task, so sync may have put them in the draft already.
  const known = new Set(current.files.map(fileID))

  updateDraft({ files: [...current.files, ...added.filter((file) => !known.has(fileID(file)))] })
}

const removedDraftFiles = new Set<string>()

export const removeDraftFile = (path: string): void => {
  const draft = ui.draft

  if (!draft) return

  for (const file of draft.files) if (file.path === path) removedDraftFiles.add(fileID(file))

  removeFile({ ID: draft.ID, path })
  updateDraft({ files: draft.files.filter((file) => file.path !== path) })
}

/**
 * Brings files that sync added or finished downloading into the open editor.
 * The draft is a copy taken when the editor opened, so without this a file from
 * another device shows on the task row but not in the editor, and saving the
 * draft would drop it.
 */
export const refreshDraftFiles = (): void => {
  const draft = ui.draft
  const todo = draft ? state.todos.find((item) => item.ID === draft.ID) : undefined

  if (!draft || !todo) return

  const synced = new Map(todo.files.map((file) => [fileID(file), file]))
  const known = new Set(draft.files.map(fileID))
  const kept = draft.files.map((file) => synced.get(fileID(file)) ?? file)
  const added = todo.files.filter((file) => !known.has(fileID(file)) && !removedDraftFiles.has(fileID(file)))
  const changed = added.length > 0 || kept.some((file, index) => file !== draft.files[index])

  if (changed) updateDraft({ files: [...kept, ...added] })
}

export const openAttachment = (file: Attachment): void => {
  if (isImage(file.name)) {
    ui.viewerPath = file.path
    return
  }

  void openPath(file.path)
}

export const openSync = (): void => {
  ui.syncOpen = true
}

export const closeSync = (): void => {
  ui.syncOpen = false
}

export const copyDraft = async (): Promise<void> => {
  const draft = ui.draft

  if (!draft) return

  try {
    await clipboard.write(todoAsText(draft, state.tags))
    await dialog.toast(tr("Скопировано"))
  } catch {}
}

export const shareDraft = async (): Promise<void> => {
  const draft = ui.draft

  if (!draft) return

  try {
    await share.text(todoAsText(draft, state.tags), {
      title: tr("Поделиться задачей"),
    })
  } catch {}
}

const closeTopLayer = (): boolean => {
  if (ui.calendarOpen) {
    closeCalendar()

    return true
  }

  if (ui.tagSheetOpen) {
    closeTagSheet()

    return true
  }

  if (ui.viewerPath) {
    ui.viewerPath = ""

    return true
  }

  if (ui.editorOpen) {
    closeEditor()

    return true
  }

  if (ui.syncOpen) {
    closeSync()

    return true
  }

  if (ui.taskCalendarOpen) {
    closeTaskCalendar()

    return true
  }

  if (ui.tagFilterOpen) {
    closeTagFilter()

    return true
  }

  if (ui.foldersOpen) {
    closeFolders()

    return true
  }

  return false
}

export const selectTaskDay = (day: Date): void => {
  ui.taskCalendarYear = day.getFullYear()
  ui.taskCalendarMonth = day.getMonth()
  ui.taskCalendarDay = day.getDate()
}

export const openTaskCalendar = (): void => {
  selectTaskDay(new Date())
  ui.taskCalendarOpen = true
}

export const closeTaskCalendar = (): void => {
  ui.taskCalendarOpen = false
}

export const shiftTaskMonth = (delta: number): void => {
  const target = new Date(ui.taskCalendarYear, ui.taskCalendarMonth + delta, 1)
  const days = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()

  ui.taskCalendarYear = target.getFullYear()
  ui.taskCalendarMonth = target.getMonth()
  ui.taskCalendarDay = Math.min(ui.taskCalendarDay, days)
}

export const handleBack = (): void => {
  if (closeTopLayer()) return

  void flushState().finally(() => app.quit())
}

export const focusNewTask = (): void => {
  ui.newTaskFocus = true
}
