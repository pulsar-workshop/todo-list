import {
  Box,
  Button,
  Chip,
  Checkbox,
  Column,
  Divider,
  For,
  Icon,
  IconButton,
  Image,
  Input,
  Page,
  Row,
  Spacer,
  Stack,
  Text,
  TextArea,
  Wrap,
  type ColorValue,
} from "pulsar"
import { exportAttachment } from "../actions.ts"
import { fileMeta } from "../format.ts"
import { isImage } from "../model.ts"
import { fileURL, getDraft, state, uiValue, setUI } from "../state.ts"
import { backgroundColor, textColor } from "../theme.ts"
import type { Attachment } from "../types.ts"
import {
  TAG_PALETTE,
  addDraftSubtask,
  attachDraftFiles,
  closeEditor,
  copyDraft,
  createDraftTag,
  deleteDraft,
  openAttachment,
  removeDraftFile,
  removeDraftSubtask,
  saveDraft,
  shareDraft,
  toggleDraftTag,
  updateDraft,
  updateDraftSubtask,
} from "./state.ts"
import { TagChip } from "./tag-chip.ts"

const section = (text: string) =>
  Text({
    text,
    size: 10,
    weight: "medium",
    color: textColor(true),
    letterSpacing: 1.2,
  })

const attachmentIcon = (file: Attachment) => {
  if (isImage(file.name)) {
    return Image({
      src: fileURL(file.path),
      width: 44,
      height: 44,
      fillMode: "PreserveAspectCrop",
    })
  }

  if (file.thumb) {
    return Stack(
      { width: 44, height: 44 },
      Image({
        src: fileURL(file.thumb),
        width: 44,
        height: 44,
        fillMode: "PreserveAspectCrop",
      }),
      Box(
        {
          width: 24,
          height: 24,
          radius: 12,
          color: "#99000000",
          align: "center",
        },
        Icon({ name: "play_arrow", size: 16, color: "#ffffff" }),
      ),
    )
  }

  return Box(
    { width: 44, height: 44, radius: 8, color: "surface", align: "center" },
    Icon({ name: "attach_file", size: 20, color: textColor(true) }),
  )
}

const attachmentRow = (file: Attachment) =>
  Row(
    { gap: 8, fillWidth: true, align: "center" },
    attachmentIcon(file),
    Column(
      { gap: 2, expand: true },
      Text({
        text: file.name,
        size: 13,
        color: textColor(false),
        elide: "middle",
      }),
      fileMeta(file.size, file.modifiedAT)
        ? Text({
            text: fileMeta(file.size, file.modifiedAT),
            size: 11,
            color: textColor(true),
          })
        : null,
    ),
    IconButton({
      icon: "open_in_new",
      tooltip: "Открыть",
      onClick: () => openAttachment(file),
    }),
    IconButton({
      icon: "download",
      tooltip: "Скачать",
      onClick: () => void exportAttachment(file.path, file.name),
    }),
    IconButton({
      icon: "close",
      tooltip: "Убрать",
      onClick: () => removeDraftFile(file.path),
    }),
  )

const header = () =>
  Row(
    { gap: 6, fillWidth: true, align: "center" },
    Button(
      { variant: "ghost", icon: "arrow_back", onClick: closeEditor },
      "Назад",
    ),
    Text({
      text: "Задача",
      size: 20,
      weight: "semibold",
      color: textColor(false),
    }),
    Spacer({ fillWidth: true }),
    Button({ onClick: saveDraft }, "Сохранить"),
  )

const footer = () =>
  Row(
    { gap: 4, fillWidth: true, align: "center" },
    Button(
      {
        variant: "ghost",
        textColor: "#ef4444",
        size: "sm",
        onClick: () => void deleteDraft(),
      },
      "Удалить",
    ),
    Button({
      variant: "ghost",
      icon: "content_copy",
      size: "sm",
      tooltip: "Копировать",
      onClick: () => void copyDraft(),
    }),
    Button({
      variant: "ghost",
      icon: "share",
      size: "sm",
      tooltip: "Поделиться",
      onClick: () => void shareDraft(),
    }),
  )

export const EditorPage = () => {
  const draft = getDraft()
  const editorError = uiValue("editorError", "")
  const currentTags = draft?.tags ?? []
  const tags = state.tags
  const tagColor = uiValue("tagColor", TAG_PALETTE[3]!)

  return Box(
    { fill: true, color: backgroundColor() },
    Page(
      { padding: 16, gap: 10, header: header(), footer: footer() },
      Input({
        value: draft?.text ?? "",
        placeholder: "Название",
        variant: "outline",
        textColor: textColor(false),
        fillWidth: true,
        onInput: (value) => updateDraft({ text: value }),
      }),
      TextArea({
        value: draft?.description ?? "",
        placeholder: "Описание",
        variant: "outline",
        textColor: textColor(false),
        lines: 3,
        fillWidth: true,
        onInput: (value) => updateDraft({ description: value }),
      }),
      Text({
        text: "Формат даты: ДД.ММ.ГГГГ ЧЧ:ММ:СС. Время можно не указывать.",
        size: 11,
        color: textColor(true),
      }),
      Row(
        { gap: 8, fillWidth: true },
        Input({
          value: uiValue("draftStart", ""),
          variant: "outline",
          textColor: textColor(false),
          placeholder: "с",
          expand: true,
          onInput: (value) => setUI("draftStart", value),
        }),
        Input({
          value: uiValue("draftEnd", ""),
          variant: "outline",
          textColor: textColor(false),
          placeholder: "до (дедлайн)",
          expand: true,
          onInput: (value) => setUI("draftEnd", value),
        }),
      ),
      Row(
        { gap: 8, fillWidth: true, align: "center" },
        Text({ text: "Создано", size: 12, color: textColor(true), width: 76 }),
        Input({
          value: uiValue("draftCreated", ""),
          variant: "outline",
          textColor: textColor(false),
          expand: true,
          onInput: (value) => setUI("draftCreated", value),
        }),
      ),
      draft && draft.completedAT !== null
        ? Row(
            { gap: 8, fillWidth: true, align: "center" },
            Text({
              text: "Завершено",
              size: 12,
              color: textColor(true),
              width: 76,
            }),
            Input({
              value: uiValue("draftCompleted", ""),
              variant: "outline",
              textColor: textColor(false),
              expand: true,
              onInput: (value) => setUI("draftCompleted", value),
            }),
          )
        : null,
      editorError
        ? Text({ text: editorError, size: 12, color: "#ef4444" })
        : null,
      Divider(),
      section("ТЕГИ"),
      Wrap(
        { gap: 6, fillWidth: true },
        ...tags.map((tag) =>
          TagChip({
            tag,
            selected: currentTags.includes(tag.ID),
            onClick: () => toggleDraftTag(tag.ID),
          }),
        ),
      ),
      Row(
        { gap: 8, fillWidth: true },
        Input({
          value: uiValue("tagName", ""),
          variant: "outline",
          textColor: textColor(false),
          placeholder: "Новый тег",
          expand: true,
          onInput: (value) => setUI("tagName", value),
          onSubmitted: createDraftTag,
        }),
        Button({ onClick: createDraftTag }, "Добавить"),
      ),
      Wrap(
        { gap: 4, fillWidth: true },
        ...TAG_PALETTE.map((color) =>
          Chip(
            {
              variant: "solid",
              color: color as ColorValue,
              selected: tagColor === color,
              onClick: () => setUI("tagColor", color),
            },
            " ",
          ),
        ),
      ),
      Divider(),
      section("ПОДЗАДАЧИ"),
      For({
        each: draft?.subtasks ?? [],
        keyOf: (subtask) => subtask.ID,
        spacing: 6,
        render: (subtask, index) =>
          Row(
            { gap: 6, fillWidth: true, align: "center" },
            Checkbox({
              checked: subtask.done,
              onToggle: (done) =>
                updateDraftSubtask(index, {
                  done,
                  completedAT: done ? Date.now() : null,
                }),
            }),
            Input({
              value: subtask.text,
              variant: "outline",
              textColor: textColor(false),
              expand: true,
              onInput: (value) => updateDraftSubtask(index, { text: value }),
            }),
            IconButton({
              icon: "close",
              tooltip: "Удалить",
              onClick: () => removeDraftSubtask(index),
            }),
          ),
      }),
      Row(
        { gap: 8, fillWidth: true },
        Input({
          value: uiValue("subtaskText", ""),
          variant: "outline",
          textColor: textColor(false),
          placeholder: "Новая подзадача",
          expand: true,
          onInput: (value) => setUI("subtaskText", value),
          onSubmitted: addDraftSubtask,
        }),
        Button({ onClick: addDraftSubtask }, "Добавить"),
      ),
      Divider(),
      section("ФАЙЛЫ"),
      For({
        each: draft?.files ?? [],
        keyOf: (file) => file.path,
        spacing: 6,
        render: attachmentRow,
      }),
      Button(
        {
          variant: "outline",
          textColor: textColor(false),
          icon: "attach_file",
          onClick: () => void attachDraftFiles(),
        },
        "Прикрепить файл",
      ),
    ),
  )
}
