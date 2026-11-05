import {
  Box,
  Card,
  Column,
  Row,
  Text,
  Wrap,
  component,
  type ColorValue,
  type UiNode,
} from "pulsar"
import { toggleTodo } from "../actions.ts"
import { dueTone, shortDate, subtaskLabel } from "../format.ts"
import { state, tagByID } from "../state.ts"
import {
  accentColor,
  borderColor,
  dangerColor,
  hoverSurfaceColor,
  surfaceColor,
  textColor,
} from "../theme.ts"
import type { Tag, Todo } from "../types.ts"
import { metaItem, squareCheck } from "./kit.ts"
import { openEditor } from "./state.ts"

const toneColor = (todo: Todo): ColorValue => {
  const tone = dueTone(todo)

  if (tone === "overdue") return dangerColor()
  if (tone === "today") return accentColor()

  return textColor(true)
}

const dueItem = (todo: Todo): UiNode | null => {
  const value = todo.endAT ?? todo.startAT

  if (value === null) return null

  const allDay = todo.endAT !== null ? todo.endAllDay : todo.startAllDay

  return metaItem(
    "due",
    "schedule",
    shortDate(value, allDay),
    toneColor(todo),
  )
}

const tagItem = (tag: Tag): UiNode =>
  Row(
    { key: `tag-${tag.ID}`, gap: 4, alignItems: "center" },
    Box({ width: 6, height: 6, radius: 3, color: tag.color as ColorValue }),
    Text({ text: tag.name, size: 12, color: textColor(true) }),
  )

export const TaskRow = component<{
  key: string
  todo: Todo
  visible?: boolean
  hideDue?: boolean
}>(({ todo, visible = true, hideDue = false }) => {
  const folder = todo.folderID
    ? state.folders.find((item) => item.ID === todo.folderID)
    : null
  const tags = todo.tags
    .map((ID) => tagByID(ID))
    .filter((tag): tag is Tag => tag !== null)

  const meta = [
    hideDue ? null : dueItem(todo),
    folder ? metaItem("folder", "folder", folder.name) : null,
    todo.subtasks.length > 0
      ? metaItem("subtasks", "checklist", subtaskLabel(todo.subtasks))
      : null,
    todo.files.length > 0
      ? metaItem("files", "attach_file", String(todo.files.length))
      : null,
    ...tags.map(tagItem),
  ].filter((item): item is UiNode => item !== null)

  return Card(
    {
      key: todo.ID,
      visible,
      padding: 2,
      radius: 10,
      elevation: 0,
      color: surfaceColor(),
      hoverColor: hoverSurfaceColor(),
      borderColor: borderColor(),
      borderWidth: 1,
      opacity: todo.done ? 0.55 : 1,
      pressed: { color: hoverSurfaceColor() },
      enter: { opacity: 0 },
      exit: { opacity: 0 },
      transition: { duration: 180 },
      onClick: () => openEditor(todo),
      drag: {
        axis: "x",
        onRelease: ({ direction }) => {
          if (direction === "right") {
            toggleTodo({ ID: todo.ID })

            return
          }

          openEditor(todo)
        },
      },
    },
    Row(
      { gap: 2, fillWidth: true },
      squareCheck({
        done: todo.done,
        onToggle: () => toggleTodo({ ID: todo.ID }),
      }),
      Column(
        { gap: 3, paddingY: 9, paddingRight: 10, fillWidth: true, flex: 1 },
        Text({
          text: todo.text,
          size: 14,
          weight: "medium",
          strike: todo.done,
          fillWidth: true,
          wrap: true,
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
              maxLines: 1,
              elide: "right",
            })
          : null,
        meta.length > 0 ? Wrap({ gap: 10, fillWidth: true }, ...meta) : null,
      ),
    ),
  )
})
