import {
  Box,
  Button,
  Column,
  Divider,
  Icon,
  Input,
  Row,
  Sheet,
  Stack,
  Text,
  Wrap,
  component,
  type ColorValue,
} from "pulsar"
import { deleteTag } from "../actions.ts"
import { isAndroid } from "../platform.ts"
import { state, ui } from "../state.ts"
import { borderColor, textColor } from "../theme.ts"
import {
  TAG_PALETTE,
  closeTagSheet,
  createDraftTag,
  pickCustomTagColor,
  toggleDraftTag,
} from "./state.ts"
import { TagChip } from "./tag-chip.ts"
import { tr } from "../i18n.ts"

export const TagSheet = component(() => {
  const draft = ui.draft
  const current = draft?.tags ?? []
  const tagColor = ui.tagColor
  const tags = state.tags
  const starter = !TAG_PALETTE.includes(tagColor)

  return Sheet(
    {
      open: true,
      title: tr("Теги"),
      onClose: closeTagSheet,
    },
    tags.length > 0
      ? Wrap(
          { gap: 6, fillWidth: true },
          ...tags.map((tag) =>
            TagChip({
              key: tag.ID,
              tag,
              selected: current.includes(tag.ID),
              onClick: () => toggleDraftTag(tag.ID),
              onRemove: () => void deleteTag({ ID: tag.ID }),
            }),
          ),
        )
      : Text({
          text: tr("Тегов пока нет — создайте первый ниже."),
          size: 12,
          color: textColor(true),
        }),
    Divider(),
    Row(
      { gap: 8, fillWidth: true, alignItems: "center" },
      Input({
        value: ui.tagName,
        placeholder: tr("Новый тег"),
        variant: "outline",
        textColor: textColor(false),
        expand: true,
        onInput: (value) => (ui.tagName = value),
        onSubmitted: createDraftTag,
      }),
      Button({ onClick: createDraftTag }, tr("Добавить")),
    ),
    Wrap(
      { gap: 8, fillWidth: true },
      ...TAG_PALETTE.map((color) =>
        Box({
          width: 30,
          height: 30,
          radius: 15,
          color: color as ColorValue,
          borderWidth: tagColor === color ? 2 : 1,
          borderColor: tagColor === color ? textColor(false) : borderColor(),
          tooltip: color,
          onClick: () => (ui.tagColor = color),
        }),
      ),
      isAndroid()
        ? null
        : Stack(
        { width: 30, height: 30 },
        Box({
          width: 30,
          height: 30,
          radius: 15,
          color: starter ? "transparent" : (tagColor as ColorValue),
          gradient: starter
            ? {
                from: "#f43f5e",
                to: "#0ea5e9",
                direction: "horizontal",
              }
            : undefined,
          borderWidth: starter ? 1 : 2,
          borderColor: starter ? borderColor() : textColor(false),
          tooltip: tr("Свой цвет"),
          onClick: () => void pickCustomTagColor(),
        }),
        starter
          ? Icon({ name: "add", size: 16, color: "#ffffff", align: "center" })
          : null,
      ),
    ),
    Button({ variant: "ghost", onClick: closeTagSheet }, tr("Готово")),
  )
})
