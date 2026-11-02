import { clipboard, dialog, share } from "pulsar"
import {
  addTag,
  deleteTodo,
  openPath,
  pickFiles,
  removeFile,
  saveTask,
} from "../actions.ts"
import { formatDateValue, parseTime, isDateOnly } from "../format.ts"
import { isImage, newID, todoAsText } from "../model.ts"
import { state, setUI, uiValue, getDraft } from "../state.ts"
import { applyTheme } from "../theme.ts"
import { saveSyncConnection } from "../sync.ts"
import type { Attachment, Subtask, Todo } from "../types.ts"

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

  setUI("draft", draft)
  setUI("draftStart", formatDateValue(draft.startAT, draft.startAllDay))
  setUI("draftEnd", formatDateValue(draft.endAT, draft.endAllDay))
  setUI("draftCreated", formatDateValue(draft.createdAT, draft.createdAllDay))
  setUI(
    "draftCompleted",
    formatDateValue(draft.completedAT, draft.completedAllDay),
  )
  setUI("tagName", "")
  setUI("tagColor", TAG_PALETTE[3]!)
  setUI("subtaskText", "")
  setUI("editorError", "")
  setUI("editorOpen", true)
  void applyTheme()
}

export const closeEditor = (): void => {
  setUI("viewerPath", "")
  setUI("editorOpen", false)
  setUI("draft", null)
  setUI("editorError", "")
}

export const updateDraft = (patch: Partial<Todo>): void => {
  const draft = getDraft()

  if (!draft) return

  setUI("draft", { ...draft, ...patch })
}

export const saveDraft = (): void => {
  const draft = getDraft()

  if (!draft) return

  const startAT = parseTime(uiValue("draftStart", ""))
  const endAT = parseTime(uiValue("draftEnd", ""))
  const createdAT = parseTime(uiValue("draftCreated", ""))
  const completedAT = parseTime(uiValue("draftCompleted", ""))

  if (
    startAT === undefined ||
    endAT === undefined ||
    createdAT === undefined ||
    completedAT === undefined
  ) {
    setUI(
      "editorError",
      "Дата: ДД.ММ.ГГГГ, время: ЧЧ:ММ:СС (время можно не указывать)",
    )
    return
  }

  const text = draft.text.trim()

  if (!text) {
    setUI("editorError", "Название не может быть пустым")
    return
  }

  const next: Todo = {
    ...draft,
    text,
    startAT,
    endAT,
    startAllDay: isDateOnly(uiValue("draftStart", "")),
    endAllDay: isDateOnly(uiValue("draftEnd", "")),
    completedAT,
    completedAllDay: isDateOnly(uiValue("draftCompleted", "")),
  }

  if (createdAT !== null) {
    next.createdAT = createdAT
    next.createdAllDay = isDateOnly(uiValue("draftCreated", ""))
  }

  saveTask({ task: next })
  closeEditor()
}

export const deleteDraft = async (): Promise<void> => {
  const draft = getDraft()

  if (!draft) return

  const ok = await dialog.message({
    title: "Удалить задачу?",
    text: "Задачу нельзя будет восстановить.",
  })

  if (!ok) return

  await deleteTodo({ ID: draft.ID })
  closeEditor()
}

export const toggleDraftTag = (ID: string): void => {
  const draft = getDraft()

  if (!draft) return

  const tags = draft.tags.includes(ID)
    ? draft.tags.filter((tagID) => tagID !== ID)
    : [...draft.tags, ID]

  updateDraft({ tags })
}

export const createDraftTag = (): void => {
  const name = uiValue("tagName", "").trim()
  const color = uiValue("tagColor", TAG_PALETTE[3]!)
  const draft = getDraft()

  if (!name || !draft) return

  const tag = addTag({ name, color })

  if (!tag) return

  if (!draft.tags.includes(tag.ID))
    updateDraft({ tags: [...draft.tags, tag.ID] })

  setUI("tagName", "")
}

export const addDraftSubtask = (): void => {
  const draft = getDraft()
  const text = uiValue("subtaskText", "").trim()

  if (!draft || !text) return

  const subtask: Subtask = {
    ID: newID(),
    text,
    done: false,
    createdAT: Date.now(),
    completedAT: null,
  }

  updateDraft({ subtasks: [...draft.subtasks, subtask] })
  setUI("subtaskText", "")
}

export const updateDraftSubtask = (
  index: number,
  patch: Partial<Subtask>,
): void => {
  const draft = getDraft()

  if (!draft) return

  updateDraft({
    subtasks: draft.subtasks.map((subtask, position) =>
      position === index ? { ...subtask, ...patch } : subtask,
    ),
  })
}

export const removeDraftSubtask = (index: number): void => {
  const draft = getDraft()

  if (!draft) return

  updateDraft({
    subtasks: draft.subtasks.filter((_subtask, position) => position !== index),
  })
}

export const attachDraftFiles = async (): Promise<void> => {
  const draft = getDraft()

  if (!draft) return

  const added = await pickFiles({ ID: draft.ID })

  if (added.length === 0) return

  const current = getDraft()

  if (!current) return

  updateDraft({ files: [...current.files, ...added] })
}

export const removeDraftFile = (path: string): void => {
  const draft = getDraft()

  if (!draft) return

  removeFile({ ID: draft.ID, path })
  updateDraft({ files: draft.files.filter((file) => file.path !== path) })
}

export const openAttachment = (file: Attachment): void => {
  if (isImage(file.name)) {
    setUI("viewerPath", file.path)
    void applyTheme()
    return
  }

  void openPath(file.path)
}

export const openSync = (): void => {
  setUI("syncHostInput", state.syncSettings.host)
  setUI("syncPortInput", state.syncSettings.port)
  setUI("syncPasswordInput", state.syncSettings.password)
  setUI("syncError", "")
  setUI("syncOpen", true)
  void applyTheme()
}

export const closeSync = (): void => {
  setUI("syncOpen", false)
}

export const saveSyncForm = async (): Promise<void> => {
  const host = uiValue("syncHostInput", "").trim()
  const portText = uiValue("syncPortInput", "").trim()
  const port = Number(portText)

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    setUI("syncError", "Порт должен быть от 1 до 65535")
    return
  }

  closeSync()
  await saveSyncConnection({
    host,
    port: portText,
    password: uiValue("syncPasswordInput", ""),
  })
}

export const copyDraft = async (): Promise<void> => {
  const draft = getDraft()

  if (!draft) return

  try {
    await clipboard.write(todoAsText(draft, state.tags))
    await dialog.toast("Скопировано")
  } catch {}
}

export const shareDraft = async (): Promise<void> => {
  const draft = getDraft()

  if (!draft) return

  try {
    await share.text(todoAsText(draft, state.tags), {
      title: "Поделиться задачей",
    })
  } catch {}
}

export const handleBack = (): void => {
  if (uiValue("viewerPath", "")) {
    setUI("viewerPath", "")
    return
  }

  if (uiValue("editorOpen", false)) {
    closeEditor()
    return
  }

  if (uiValue("syncOpen", false)) closeSync()
}

export const focusNewTask = (): void => {
  setUI("newTaskFocus", true)
}
