import {
  Box,
  Button,
  Card,
  Checkbox,
  Column,
  Row,
  Spacer,
  Text,
  defineComponent,
  type ColorValue,
} from "pulsar"
import { toggleTodo } from "../actions.ts"
import { formatDateValue, formatDates, subtaskLabel } from "../format.ts"
import { state, tagByID } from "../state.ts"
import {
  borderColor,
  hoverSurfaceColor,
  surfaceColor,
  textColor,
} from "../theme.ts"
import type { Tag, Todo } from "../types.ts"
import { openEditor } from "./state.ts"

const metaLine = (todo: Todo): string => {
  const folder = todo.folderID
    ? state.folders.find((item) => item.ID === todo.folderID)
    : null
  const parts = [
    `Создано: ${formatDateValue(todo.createdAT, todo.createdAllDay)}`,
  ]

  if (folder) parts.unshift(folder.name)

  if (todo.completedAT !== null)
    parts.push(
      `Завершено: ${formatDateValue(todo.completedAT, todo.completedAllDay)}`,
    )
  if (todo.startAT !== null || todo.endAT !== null)
    parts.push(formatDates(todo))
  if (todo.subtasks.length > 0) parts.push(subtaskLabel(todo.subtasks))
  if (todo.files.length > 0) parts.push(`Файлов: ${todo.files.length}`)

  return parts.join(" · ")
}

export const TaskRow = defineComponent<{
  todo: Todo
  visible?: boolean
}>(({ todo, visible = true }) => {
  const tags = todo.tags
    .map((ID) => tagByID(ID))
    .filter((tag): tag is Tag => tag !== null)

  const tagLabels = tags.map((tag) =>
    Row(
      { gap: 4, align: "center" },
      Box({ width: 6, height: 6, radius: 3, color: tag.color as ColorValue }),
      Text({ text: tag.name, size: 11, color: textColor(true) }),
    ),
  )

  return Card(
    {
      key: todo.ID,
      visible,
      padding: 12,
      radius: 10,
      elevation: 0,
      color: surfaceColor(),
      hoverColor: hoverSurfaceColor(),
      borderColor: borderColor(),
      borderWidth: 1,
      opacity: todo.done ? 0.62 : 1,
      onLongPress: () => openEditor(todo),
    },
    Row(
      { gap: 10, fillWidth: true },
      Checkbox({
        checked: todo.done,
        onToggle: () => toggleTodo({ ID: todo.ID }),
      }),
      Column(
        { gap: 4, fillWidth: true, expand: true },
        Text({
          text: todo.text,
          size: 15,
          weight: "semibold",
          strike: todo.done,
          fillWidth: true,
          maxLines: 2,
          elide: "right",
          color: textColor(todo.done),
        }),
        todo.description
          ? Text({
              text: todo.description,
              size: 12,
              color: textColor(true),
              fillWidth: true,
              maxLines: 2,
              elide: "right",
            })
          : null,
        Text({
          text: metaLine(todo),
          size: 11,
          color: textColor(true),
          fillWidth: true,
          maxLines: 2,
          elide: "right",
        }),
        tagLabels.length > 0
          ? Row({ gap: 10, fillWidth: true }, ...tagLabels)
          : null,
      ),
      Spacer({ fillWidth: true }),
      Button({
        variant: "ghost",
        icon: "edit",
        size: "sm",
        tooltip: "Изменить",
        onClick: () => openEditor(todo),
      }),
    ),
  )
})
