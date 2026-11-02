import type { Attachment, Subtask, Tag, Todo } from "./types.ts"

export const DEFAULT_PORT = "8787"

const VIDEO_PATTERN = /\.(mp4|m4v|mov|webm|mkv|avi|3gp)$/i
const IMAGE_PATTERN = /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i

export const newID = (): string => {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export const asNumber = (value: unknown): number | null => {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

export const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export const isVideo = (name: string): boolean => {
  return VIDEO_PATTERN.test(name)
}

export const isImage = (name: string): boolean => {
  return IMAGE_PATTERN.test(name)
}

export const baseName = (path: string): string => {
  return path.split(/[\\/]/).pop() ?? path
}

export const attachmentKey = (todoID: string, file: Attachment): string => {
  return file.key ?? `${todoID}/${baseName(file.path)}`
}

export const thumbPath = (
  root: string,
  todoID: string,
  file: Attachment,
): string => {
  return `${root}/${todoID}/.thumb-${baseName(file.path)}.jpg`
}

export const parseSubtask = (value: unknown): Subtask | null => {
  if (!isRecord(value)) return null

  if (typeof value.ID !== "string") return null
  if (typeof value.text !== "string") return null
  if (typeof value.done !== "boolean") return null

  return {
    ID: value.ID,
    text: value.text,
    done: value.done,
    createdAT: asNumber(value.createdAT) ?? Date.now(),
    completedAT: asNumber(value.completedAT),
  }
}

export const parseAttachment = (value: unknown): Attachment | null => {
  if (!isRecord(value)) return null

  if (typeof value.name !== "string") return null
  if (typeof value.path !== "string") return null

  const attachment: Attachment = { name: value.name, path: value.path }

  if (typeof value.key === "string") attachment.key = value.key
  if (typeof value.thumb === "string") attachment.thumb = value.thumb
  if (typeof value.size === "number") attachment.size = value.size
  if (typeof value.modifiedAT === "number")
    attachment.modifiedAT = value.modifiedAT

  return attachment
}

export const parseTodo = (value: unknown): Todo | null => {
  if (!isRecord(value)) return null

  const rawID = value.ID ?? value.id

  if (typeof rawID !== "string") return null
  if (typeof value.text !== "string") return null
  if (typeof value.done !== "boolean") return null

  const subtasks = Array.isArray(value.subtasks)
    ? value.subtasks
        .map(parseSubtask)
        .filter((subtask): subtask is Subtask => subtask !== null)
    : []

  const files = Array.isArray(value.files)
    ? value.files
        .map(parseAttachment)
        .filter((file): file is Attachment => file !== null)
    : []

  return {
    ID: rawID,
    text: value.text,
    description: typeof value.description === "string" ? value.description : "",
    done: value.done,
    createdAT: asNumber(value.createdAT ?? value.createdAt) ?? Date.now(),
    updatedAT:
      asNumber(value.updatedAT) ?? asNumber(value.createdAT) ?? Date.now(),
    completedAT: asNumber(value.completedAT),
    startAT: asNumber(value.startAT),
    endAT: asNumber(value.endAT),
    createdAllDay: value.createdAllDay === true,
    completedAllDay: value.completedAllDay === true,
    startAllDay: value.startAllDay === true,
    endAllDay: value.endAllDay === true,
    tags: Array.isArray(value.tags)
      ? value.tags.filter((tag): tag is string => typeof tag === "string")
      : [],
    subtasks,
    files,
  }
}

export const parseTag = (value: unknown): Tag | null => {
  if (!isRecord(value)) return null

  if (typeof value.ID !== "string") return null
  if (typeof value.name !== "string") return null
  if (typeof value.color !== "string") return null

  return {
    ID: value.ID,
    name: value.name,
    color: value.color,
    updatedAT: asNumber(value.updatedAT) ?? Date.now(),
  }
}

export const parseDeleted = (value: unknown): Record<string, number> => {
  if (!isRecord(value)) return {}

  const result: Record<string, number> = {}

  for (const [ID, at] of Object.entries(value)) {
    if (typeof at === "number" && Number.isFinite(at)) result[ID] = at
  }

  return result
}

export const normalizeAttachments = (todos: Todo[]): boolean => {
  let changed = false

  for (const todo of todos) {
    for (const file of todo.files) {
      if (file.key) continue

      file.key = attachmentKey(todo.ID, file)
      changed = true
    }
  }

  return changed
}

export const todoAsText = (todo: Todo, tags: Tag[]): string => {
  const lines = [`${todo.done ? "[x]" : "[ ]"} ${todo.text}`]

  if (todo.description) lines.push(todo.description)

  for (const subtask of todo.subtasks)
    lines.push(`${subtask.done ? "[x]" : "[ ]"} ${subtask.text}`)

  if (todo.tags.length > 0) {
    const names = todo.tags.map(
      (ID) => tags.find((tag) => tag.ID === ID)?.name ?? ID,
    )

    lines.push(`Теги: ${names.join(", ")}`)
  }

  return lines.join("\n")
}
