import type { Subtask, Todo } from "./types.ts"

const pad2 = (value: number): string => {
  return String(value).padStart(2, "0")
}

export const formatDateValue = (
  value: number | null,
  allDay: boolean,
): string => {
  if (value === null) return ""

  const date = new Date(value)
  const day = `${pad2(date.getDate())}.${pad2(date.getMonth() + 1)}.${date.getFullYear()}`

  if (allDay) return day

  return `${day} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`
}

export const isDateOnly = (text: string): boolean => {
  return text.trim() !== "" && !/\d{1,2}:\d{2}/.test(text)
}

export const parseTime = (text: string): number | null | undefined => {
  const value = text.trim()

  if (value === "") return null

  const match = value.match(
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  )

  if (!match) return undefined

  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  const hour = match[4] === undefined ? 0 : Number(match[4])
  const minute = match[5] === undefined ? 0 : Number(match[5])
  const second = match[6] === undefined ? 0 : Number(match[6])

  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined
  if (hour > 23 || minute > 59 || second > 59) return undefined

  const date = new Date(year, month - 1, day, hour, minute, second)

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  )
    return undefined

  return date.getTime()
}

export const formatDates = (todo: Todo): string => {
  if (todo.startAT !== null && todo.endAT !== null) {
    return `с ${formatDateValue(todo.startAT, todo.startAllDay)} до ${formatDateValue(todo.endAT, todo.endAllDay)}`
  }

  if (todo.endAT !== null)
    return `до ${formatDateValue(todo.endAT, todo.endAllDay)}`
  if (todo.startAT !== null)
    return `с ${formatDateValue(todo.startAT, todo.startAllDay)}`

  return ""
}

export const subtaskLabel = (subtasks: Subtask[]): string => {
  if (subtasks.length === 0) return ""

  const done = subtasks.filter((subtask) => subtask.done).length

  return `Подзадачи: ${done}/${subtasks.length}`
}

export const fileMeta = (size?: number, modifiedAT?: number): string => {
  const parts: string[] = []

  if (size) parts.push(`${Math.max(1, Math.round(size / 1024))} КБ`)
  if (modifiedAT) parts.push(formatDateValue(modifiedAT, true))

  return parts.join(" · ")
}
