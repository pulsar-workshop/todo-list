import {
  Box,
  Button,
  Column,
  Icon,
  IconButton,
  Image,
  Input,
  Page,
  Row,
  Segmented,
  Select,
  Stack,
  Text,
  TextArea,
  Wrap,
  component,
} from "pulsar"
import { exportAttachment } from "../actions.ts"
import { fileMeta, shortDate } from "../format.ts"
import { isImage } from "../model.ts"
import { breakpoints, fileURL, state, ui, type DateField } from "../state.ts"
import {
  accentFrom,
  backgroundColor,
  borderColor,
  dangerColor,
  hoverSurfaceColor,
  textColor,
} from "../theme.ts"
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
import {
  accentButton,
  accentGradient,
  iconTile,
  panel,
  roundCheck,
  sectionTitle,
} from "./kit.ts"

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
    { gap: 8, fillWidth: true, alignItems: "center" },
    iconTile({ icon: "arrow_back", tooltip: "Назад", onClick: closeEditor }),
    Text({
      text: "Задача",
      size: 20,
      weight: "semibold",
      color: textColor(false),
      flex: 1,
    }),
    iconTile({
      icon: "content_copy",
      tooltip: "Копировать",
      onClick: () => void copyDraft(),
    }),
    iconTile({
      icon: "delete",
      tooltip: "Удалить",
      color: dangerColor(),
      onClick: () => void deleteDraft(),
    }),
    accentButton({ label: "Сохранить", onClick: saveDraft }),
  )

const dateRow = (label: string, key: DateField, withTime = true) =>
  Row(
    {
      key,
      gap: 12,
      paddingX: 12,
      paddingY: 10,
      radius: 14,
      color: hoverSurfaceColor(),
      fillWidth: true,
      alignItems: "center",
      pressed: { scale: 0.98 },
      transition: { duration: 90 },
      onClick: () => openCalendar(key, withTime),
    },
    Icon({ name: "calendar_month", size: 20, color: accentFrom() }),
    Column(
      { gap: 1, flex: 1 },
      Text({ text: label, size: 12, color: textColor(true) }),
      Text({
        text: ui[key] || "Не выбрано",
        size: 15,
        color: textColor(!ui[key]),
      }),
    ),
  )

const subtaskText = (subtask: Subtask, index: number) => {
  if (ui.subtaskEditing === subtask.ID) {
    return TextArea({
      value: subtask.text,
      variant: "outline",
      textColor: textColor(false),
      lines: Math.max(2, Math.ceil(subtask.text.length / 30)),
      autoFocus: true,
      fillWidth: true,
      onInput: (value) => updateDraftSubtask(index, { text: value }),
      onBlur: () => {
        ui.subtaskEditing = ""
      },
    })
  }

  return Box(
    {
      fillWidth: true,
      onClick: () => {
        ui.subtaskEditing = subtask.ID
      },
    },
    Text({
      text: subtask.text,
      size: 15,
      strike: subtask.done,
      wrap: true,
      fillWidth: true,
      color: textColor(subtask.done),
    }),
  )
}

const subtaskRow = (subtask: Subtask, index: number) =>
  Row(
    { key: subtask.ID, gap: 2, fillWidth: true, alignItems: "start" },
    roundCheck({
      done: subtask.done,
      size: 22,
      onToggle: () => {
        const done = !subtask.done

        updateDraftSubtask(index, {
          done,
          completedAT: done ? Date.now() : null,
        })
      },
    }),
    Column(
      { gap: 2, paddingY: 9, flex: 1, fillWidth: true },
      subtaskText(subtask, index),
      subtask.completedAT !== null
        ? Text({
            text: `Готово: ${shortDate(subtask.completedAT, false)}`,
            size: 12,
            color: textColor(true),
          })
        : null,
    ),
    Column(
      {
        width: 40,
        height: 40,
        justify: "center",
        alignItems: "center",
        pressed: { scale: 0.85 },
        onClick: () => removeDraftSubtask(index),
      },
      Icon({ name: "close", size: 18, color: textColor(true) }),
    ),
  )

const subtaskProgress = (subtasks: Subtask[]) => {
  const done = subtasks.filter((subtask) => subtask.done).length
  const left = subtasks.length - done

  return Row(
    { height: 3, radius: 2, clip: true, fillWidth: true },
    done > 0
      ? Box({ key: "done", flex: done, height: 3, gradient: accentGradient() })
      : null,
    left > 0 ? Box({ key: "left", flex: left, height: 3, color: borderColor() }) : null,
  )
}

const Subtasks = component<{ subtasks: Subtask[] }>(({ subtasks }) => {
  const done = subtasks.filter((subtask) => subtask.done).length

  return panel(
    { gap: 6 },
    Row(
      { fillWidth: true, justify: "between", alignItems: "center" },
      sectionTitle("ПОДЗАДАЧИ"),
      subtasks.length > 0
        ? Text({ text: `${done}/${subtasks.length}`, size: 12, color: textColor(true) })
        : null,
    ),
    subtasks.length > 0 ? subtaskProgress(subtasks) : null,
    ...subtasks.map(subtaskRow),
    Row(
      { key: "new-subtask", gap: 8, fillWidth: true, alignItems: "center" },
      Input({
        value: ui.subtaskText,
        variant: "outline",
        textColor: textColor(false),
        placeholder: "Новая подзадача",
        expand: true,
        onInput: (value) => (ui.subtaskText = value),
        onSubmitted: addDraftSubtask,
      }),
      accentButton({ icon: "add", onClick: addDraftSubtask }),
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
  const draft = ui.draft
  const currentTags = draft?.tags ?? []
  const isAllDay = ui.draftDateMode === "allDay"

  return Box(
    { key: "editor", fill: true, color: backgroundColor() },
    Page(
      { padding: 16, gap: 12, header: header() },
      panel(
        { key: "main" },
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
      ),
      panel(
        { key: "dates", gap: 8 },
        sectionTitle("ВРЕМЯ"),
        Segmented({
          items: ["Весь день", "С и до"],
          value: isAllDay ? 0 : 1,
          fillWidth: true,
          onChange: (index) =>
            setDraftDateMode(index === 0 ? "allDay" : "range"),
        }),
        isAllDay ? dateRow("Дата", "draftEnd", false) : dateRow("С", "draftStart"),
        isAllDay ? null : dateRow("До (дедлайн)", "draftEnd"),
        dateRow("Создано", "draftCreated"),
        draft && draft.completedAT !== null
          ? dateRow("Завершено", "draftCompleted")
          : null,
        ui.editorError
          ? Text({ text: ui.editorError, size: 12, color: dangerColor() })
          : null,
      ),
      Subtasks({ subtasks: draft?.subtasks ?? [] }),
      panel(
        { key: "folder" },
        sectionTitle("ПАПКА"),
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
      ),
      panel(
        { key: "tags" },
        sectionTitle("ТЕГИ"),
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
          : null,
        Button(
          { variant: "outline", icon: "sell", fillWidth: true, onClick: openTagSheet },
          "Выбрать теги",
        ),
      ),
      panel(
        { key: "files" },
        sectionTitle("ФАЙЛЫ"),
        Files({ files: draft?.files ?? [] }),
        Button(
          {
            variant: "outline",
            icon: "attach_file",
            fillWidth: true,
            onClick: () => void attachDraftFiles(),
          },
          "Прикрепить файл",
        ),
      ),
      ui.calendarOpen ? CalendarSheet({}) : null,
      ui.tagSheetOpen ? TagSheet({}) : null,
    ),
  )
})
