import {
  Box,
  Button,
  Column,
  Divider,
  Icon,
  IconButton,
  Image,
  Input,
  Page,
  Row,
  Select,
  Spacer,
  Stack,
  Text,
  TextArea,
  Wrap,
} from "pulsar"
import { exportAttachment } from "../actions.ts"
import { fileMeta, formatDateValue } from "../format.ts"
import { isImage } from "../model.ts"
import {
  breakpoints,
  fileURL,
  getDraft,
  state,
  uiValue,
  setUI,
} from "../state.ts"
import { backgroundColor, textColor } from "../theme.ts"
import type { Attachment, Subtask } from "../types.ts"
import {
  addDraftSubtask,
  attachDraftFiles,
  closeEditor,
  copyDraft,
  deleteDraft,
  openAttachment,
  openCalendar,
  openTagSheet,
  removeDraftFile,
  removeDraftSubtask,
  saveDraft,
  updateDraft,
  updateDraftSubtask,
} from "./state.ts"
import { CalendarSheet } from "./calendar.ts"
import { TagSheet } from "./tag-sheet.ts"
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

const subtaskMeta = (subtask: Subtask): string => {
  const parts = [`Создано: ${formatDateValue(subtask.createdAT, false)}`]

  if (subtask.completedAT !== null)
    parts.push(`Завершено: ${formatDateValue(subtask.completedAT, false)}`)

  return parts.join(" · ")
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
  )

const dateInput = (key: string) =>
  Row(
    { gap: 4, fillWidth: true, align: "center" },
    Input({
      value: uiValue(key, ""),
      variant: "outline",
      textColor: textColor(false),
      readOnly: true,
      placeholder: "ДД.ММ.ГГГГ",
      expand: true,
    }),
    IconButton({
      icon: "calendar_month",
      tooltip: "Выбрать дату",
      onClick: () => openCalendar(key),
    }),
  )

const dateField = (label: string, key: string) =>
  Column(
    { gap: 4, expand: true },
    Text({ text: label, size: 11, color: textColor(true) }),
    dateInput(key),
  )

export const EditorPage = () => {
  const compact = breakpoints.is("compact")
  const draft = getDraft()
  const editorError = uiValue("editorError", "")
  const currentTags = draft?.tags ?? []

  return Box(
    { key: "editor", fill: true, color: backgroundColor() },
    Page(
      {
        padding: compact ? 12 : 16,
        gap: 10,
        header: header(),
        footer: footer(),
      },
      Input({
        value: draft?.text ?? "",
        placeholder: "Название",
        variant: "outline",
        textColor: textColor(false),
        height: 48,
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
        text: "Дата и время выбираются в календаре.",
        size: 11,
        color: textColor(true),
      }),
      compact
        ? Column(
            { gap: 8, fillWidth: true },
            dateField("С", "draftStart"),
            dateField("До (дедлайн)", "draftEnd"),
          )
        : Row(
            { gap: 8, fillWidth: true, align: "start" },
            dateField("С", "draftStart"),
            dateField("До (дедлайн)", "draftEnd"),
          ),
      Row(
        { gap: 8, fillWidth: true, align: "center" },
        Text({ text: "Создано", size: 12, color: textColor(true), width: 76 }),
        dateInput("draftCreated"),
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
            dateInput("draftCompleted"),
          )
        : null,
      editorError
        ? Text({ text: editorError, size: 12, color: "#ef4444" })
        : null,
      Divider(),
      section("ПАПКА"),
      Select({
        options: [
          { value: "", label: "Без папки" },
          ...state.folders.map((folder) => ({
            value: folder.ID,
            label: folder.name,
          })),
        ],
        value: draft?.folderID ?? "",
        fillWidth: true,
        onChange: (value) => updateDraft({ folderID: String(value) || null }),
      }),
      Divider(),
      section("ТЕГИ"),
      currentTags.length > 0
        ? Wrap(
            { gap: 6, fillWidth: true },
            ...currentTags.map((ID) => {
              const tag = state.tags.find((item) => item.ID === ID)

              return tag
                ? TagChip({ tag, selected: true, onClick: openTagSheet })
                : null
            }),
          )
        : Text({ text: "Теги не выбраны", size: 12, color: textColor(true) }),
      Button(
        { variant: "outline", icon: "sell", onClick: openTagSheet },
        "Выбрать теги",
      ),
      Divider(),
      section("ПОДЗАДАЧИ"),
      Column(
        { gap: 6, fillWidth: true },
        ...(draft?.subtasks ?? []).map((subtask, index) =>
          Row(
            { gap: 6, fillWidth: true, align: "center" },
            Button({
              variant: "ghost",
              icon: subtask.done ? "check_box" : "check_box_outline_blank",
              size: "sm",
              tooltip: subtask.done ? "Снять отметку" : "Готово",
              onClick: () => {
                const done = !subtask.done

                updateDraftSubtask(index, {
                  done,
                  completedAT: done ? Date.now() : null,
                })
              },
            }),
            Column(
              { gap: 2, expand: true },
              Input({
                value: subtask.text,
                variant: "outline",
                textColor: subtask.done ? textColor(true) : textColor(false),
                strike: subtask.done,
                fillWidth: true,
                onInput: (value) => updateDraftSubtask(index, { text: value }),
              }),
              Text({
                text: subtaskMeta(subtask),
                size: 11,
                color: textColor(true),
                fillWidth: true,
              }),
            ),
            IconButton({
              icon: "close",
              tooltip: "Удалить",
              onClick: () => removeDraftSubtask(index),
            }),
          ),
        ),
      ),
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
      Column(
        { gap: 6, fillWidth: true },
        ...(draft?.files ?? []).map((file) => attachmentRow(file)),
      ),
      Button(
        {
          variant: "outline",
          textColor: textColor(false),
          icon: "attach_file",
          onClick: () => void attachDraftFiles(),
        },
        "Прикрепить файл",
      ),
      uiValue("calendarOpen", false) ? CalendarSheet() : null,
      uiValue("tagSheetOpen", false) ? TagSheet() : null,
    ),
  )
}
