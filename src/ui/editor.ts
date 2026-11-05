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
  Segmented,
  Select,
  Spacer,
  Stack,
  Text,
  TextArea,
  Wrap,
  component,
} from "pulsar"
import { exportAttachment } from "../actions.ts"
import { fileMeta, formatDateValue } from "../format.ts"
import { isImage } from "../model.ts"
import { breakpoints, fileURL, state, ui, type DateField } from "../state.ts"
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
  setDraftDateMode,
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

  return Column(
    {
      width: 44,
      height: 44,
      radius: 8,
      color: "surface",
      align: "center",
      justify: "center",
      alignItems: "center",
    },
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
    { key: file.path, gap: 8, fillWidth: true, alignItems: "center" },
    attachmentIcon(file),
    Column(
      { gap: 2, expand: true, fillWidth: true },
      Text({
        text: file.name,
        size: 13,
        color: textColor(false),
        fillWidth: true,
        maxLines: 1,
        elide: "middle",
      }),
      fileMeta(file.size, file.modifiedAT)
        ? Text({
            text: fileMeta(file.size, file.modifiedAT),
            size: 11,
            color: textColor(true),
            fillWidth: true,
            maxLines: 1,
            elide: "right",
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
      onClick: () => void exportAttachment(file.path, file.name, file.modifiedAT),
    }),
    IconButton({
      icon: "close",
      tooltip: "Убрать",
      onClick: () => removeDraftFile(file.path),
    }),
  )

const header = () =>
  Row(
    { gap: 6, fillWidth: true, alignItems: "center" },
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
    { gap: 4, fillWidth: true, alignItems: "center" },
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

const dateInput = (key: DateField, withTime = true) =>
  Row(
    { gap: 4, fillWidth: true, alignItems: "center" },
    Input({
      value: ui[key],
      variant: "outline",
      textColor: textColor(false),
      readOnly: true,
      placeholder: withTime ? "ДД.ММ.ГГГГ ЧЧ:ММ:СС" : "ДД.ММ.ГГГГ",
      expand: true,
    }),
    IconButton({
      icon: "calendar_month",
      tooltip: "Выбрать дату",
      onClick: () => openCalendar(key, withTime),
    }),
  )

const dateField = (label: string, key: DateField, withTime = true) =>
  Column(
    { gap: 4, expand: true },
    Text({ text: label, size: 11, color: textColor(true) }),
    dateInput(key, withTime),
  )

const Subtasks = component<{ subtasks: Subtask[] }>(({ subtasks }) => {
  return Column(
    { gap: 6, fillWidth: true },
    ...subtasks.map((subtask, index) =>
      Row(
        { key: subtask.ID, gap: 6, fillWidth: true, alignItems: "center" },
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
            wrap: true,
            maxLines: 2,
            elide: "right",
          }),
        ),
        IconButton({
          icon: "close",
          tooltip: "Удалить",
          onClick: () => removeDraftSubtask(index),
        }),
      ),
    ),
  )
})

const Files = component<{ files: Attachment[] }>(({ files }) => {
  return Column(
    { gap: 6, fillWidth: true },
    ...files.map((file) => attachmentRow(file)),
  )
})

export const EditorPage = component(() => {
  const compact = breakpoints.is("compact")
  const draft = ui.draft
  const editorError = ui.editorError
  const currentTags = draft?.tags ?? []
  const dateMode = ui.draftDateMode
  const isAllDay = dateMode === "allDay"
  const rangeFields = compact
    ? Column(
        { gap: 8, fillWidth: true },
        dateField("С", "draftStart"),
        dateField("До (дедлайн)", "draftEnd"),
      )
    : Row(
        { gap: 8, fillWidth: true, alignItems: "start" },
        dateField("С", "draftStart"),
        dateField("До (дедлайн)", "draftEnd"),
      )
  const dateFields = isAllDay
    ? dateField("Дата", "draftEnd", false)
    : rangeFields

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
      Segmented({
        items: ["Весь день", "С и до"],
        value: isAllDay ? 0 : 1,
        fillWidth: true,
        onChange: (index) =>
          setDraftDateMode(index === 0 ? "allDay" : "range"),
      }),
      dateFields,
      Row(
        { gap: 8, fillWidth: true, alignItems: "center" },
        Text({ text: "Создано", size: 12, color: textColor(true), width: 76 }),
        dateInput("draftCreated"),
      ),
      draft && draft.completedAT !== null
        ? Row(
            { gap: 8, fillWidth: true, alignItems: "center" },
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
                ? TagChip({ key: tag.ID, tag, selected: true, onClick: openTagSheet })
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
      Subtasks({ subtasks: draft?.subtasks ?? [] }),
      Row(
        { gap: 8, fillWidth: true },
        Input({
          value: ui.subtaskText,
          variant: "outline",
          textColor: textColor(false),
          placeholder: "Новая подзадача",
          expand: true,
          onInput: (value) => (ui.subtaskText = value),
          onSubmitted: addDraftSubtask,
        }),
        Button({ onClick: addDraftSubtask }, "Добавить"),
      ),
      Divider(),
      section("ФАЙЛЫ"),
      Files({ files: draft?.files ?? [] }),
      Button(
        {
          variant: "outline",
          textColor: textColor(false),
          icon: "attach_file",
          onClick: () => void attachDraftFiles(),
        },
        "Прикрепить файл",
      ),
      ui.calendarOpen ? CalendarSheet({}) : null,
      ui.tagSheetOpen ? TagSheet({}) : null,
    ),
  )
})
