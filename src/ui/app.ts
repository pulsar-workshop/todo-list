import {
  Box,
  Button,
  Card,
  Chip,
  Column,
  Icon,
  Input,
  Page,
  Row,
  SearchField,
  Spacer,
  Stack,
  Text,
  Wrap,
  component,
  signal,
  type UiNode,
} from "pulsar"
import { addTodo } from "../actions.ts"
import {
  activeCount,
  activeFolder,
  activeTags,
  breakpoints,
  sortedTodos,
  state,
  syncColor,
  syncLabel,
  ui,
} from "../state.ts"
import { syncNow } from "../sync.ts"
import {
  backgroundColor,
  borderColor,
  isDarkTheme,
  surfaceColor,
  textColor,
  toggleTheme,
} from "../theme.ts"
import type { Todo } from "../types.ts"
import { EditorPage } from "./editor.ts"
import { FolderSheet } from "./folder-sheet.ts"
import { TOUCH_SCROLL } from "./scroll.ts"
import {
  clearTodoFilters,
  openFolders,
  openSync,
  openTagFilter,
} from "./state.ts"
import { SyncPage } from "./sync-dialog.tsx"
import { TagFilterSheet } from "./tag-filter-sheet.ts"
import { TaskRow } from "./task-row.ts"
import { ViewerPage } from "./viewer.ts"

const Header = component(() => {
  const compact = breakpoints.is("compact")

  return Row(
    { fillWidth: true, gap: compact ? 6 : 10 },
    Column(
      { gap: 3, expand: true },
      Text({
        text: "Задачи",
        size: 24,
        weight: "semibold",
        color: textColor(false),
      }),
      Row(
        { gap: 8, alignItems: "center" },
        Text({
          text: `Осталось: ${activeCount.get()}`,
          size: 12,
          color: textColor(true),
        }),
        Box({ width: 6, height: 6, radius: 3, color: syncColor() }),
        compact
          ? null
          : Text({ text: syncLabel(), size: 12, color: syncColor() }),
      ),
    ),
    Spacer({ fillWidth: true }),
    Button({
      variant: "ghost",
      icon: "sync",
      tooltip: "Синхронизировать",
      onClick: () => (state.syncSettings.host ? void syncNow() : openSync()),
    }),
    compact
      ? null
      : Button({
          variant: "ghost",
          icon: isDarkTheme() ? "light_mode" : "dark_mode",
          tooltip: "Сменить тему",
          onClick: toggleTheme,
        }),
    Button({
      variant: "ghost",
      icon: "settings",
      tooltip: "Настройки",
      onClick: openSync,
    }),
  )
})

const folderChip = (key: string, label: string) => {
  const selected = activeFolder.get() === key

  return Chip(
    {
      key: `folder-${key}`,
      variant: "outline",
      color: selected ? textColor(false) : textColor(true),
      selected,
      selectedColor: textColor(false),
      onClick: () => {
        ui.folderFilter = key
      },
    },
    label,
  )
}

const FolderChips = component(() => {
  return Wrap(
    { gap: 6, fillWidth: true },
    folderChip("", "Все"),
    folderChip("none", "Без папки"),
    ...state.folders.map((folder) => folderChip(folder.ID, folder.name)),
    Button({
      key: "folders",
      variant: "ghost",
      icon: "folder",
      size: "sm",
      tooltip: "Папки",
      onClick: openFolders,
    }),
  )
})

const NewTask = component(() => {
  const text = signal("")

  const submit = (): void => {
    const value = text.peek().trim()

    if (!value) return

    const folder = activeFolder.peek()

    addTodo({ text: value, folderID: folder && folder !== "none" ? folder : null })
    text.set("")
  }

  return () => {
    return Card(
      {
        padding: 8,
        radius: 10,
        elevation: 0,
        color: surfaceColor(),
        borderColor: borderColor(),
        borderWidth: 1,
      },
      Row(
        { gap: 8, fillWidth: true, alignItems: "center" },
        Input({
          value: text.get(),
          placeholder: "Что нужно сделать?",
          variant: "outline",
          textColor: textColor(false),
          expand: true,
          autoFocus: ui.newTaskFocus,
          onInput: (value) => text.set(value),
          onSubmitted: submit,
          onBlur: () => {
            ui.newTaskFocus = false
          },
        }),
        Button({ onClick: submit }, "Добавить"),
      ),
    )
  }
})

const SearchRow = component(() => {
  const filtering =
    ui.todoQuery.trim().length > 0 ||
    activeTags.get().length > 0 ||
    activeFolder.get() !== ""

  return Row(
    { gap: 8, fillWidth: true, alignItems: "center" },
    SearchField({
      value: ui.todoQuery,
      placeholder: "Поиск задач",
      fillWidth: true,
      onInput: (value) => {
        ui.todoQuery = value
      },
    }),
    filtering
      ? Button(
          { variant: "ghost", size: "sm", onClick: clearTodoFilters },
          "Сбросить",
        )
      : Box({ width: 84 }),
  )
})

const TagFilterButton = component(() => {
  const count = activeTags.get().length

  return Row(
    { gap: 8, fillWidth: true, justify: "center", alignItems: "center" },
    Button(
      { variant: "outline", icon: "sell", onClick: openTagFilter },
      count > 0 ? `Теги · ${count}` : "Теги",
    ),
  )
})

const message = (icon: UiNode, title: string, hint: string) => {
  return Column(
    { gap: 10, padding: 24, alignItems: "center", fillWidth: true },
    icon,
    Text({
      text: title,
      size: 17,
      weight: "semibold",
      color: textColor(false),
      align: "center",
      fillWidth: true,
    }),
    Text({
      text: hint,
      size: 13,
      color: textColor(true),
      align: "center",
      wrap: true,
      fillWidth: true,
    }),
  )
}

const EmptyState = component(() => {
  return message(
    Box(
      {
        width: 64,
        height: 64,
        radius: 32,
        color: surfaceColor(),
        borderWidth: 1,
        borderColor: borderColor(),
        padding: 18,
        align: "center",
      },
      Icon({ name: "checklist", size: 28, color: textColor(true) }),
    ),
    "Пока пусто",
    "Добавьте первую задачу.",
  )
})

const NothingFound = component(() => {
  return message(
    Icon({
      name: "search_off",
      size: 32,
      color: textColor(true),
      fillWidth: true,
      align: "center",
    }),
    "Ничего не найдено",
    "Измените запрос или сбросьте фильтры.",
  )
})

const TaskList = component(() => {
  const query = ui.todoQuery.trim().toLowerCase()
  const tags = activeTags.get()
  const folder = activeFolder.get()

  const matches = (todo: Todo): boolean => {
    if (folder === "none" && todo.folderID) return false
    if (folder && folder !== "none" && todo.folderID !== folder) return false
    if (tags.length > 0 && !todo.tags.some((ID) => tags.includes(ID))) return false

    if (!query) return true

    return `${todo.text}\n${todo.description}`.toLowerCase().includes(query)
  }

  const rows = sortedTodos.get().map((todo) => ({ todo, visible: matches(todo) }))
  const empty = !rows.some((row) => row.visible)

  return Column(
    { gap: 8, fillWidth: true },
    ...rows.map(({ todo, visible }) => TaskRow({ key: todo.ID, todo, visible })),
    empty ? (rows.length === 0 ? EmptyState({}) : NothingFound({})) : null,
  )
})

const MainPage = component(() => {
  const compact = breakpoints.is("compact")

  return Box(
    { key: "main", fill: true, color: backgroundColor() },
    Page(
      {
        ...TOUCH_SCROLL,
        padding: compact ? 14 : 20,
        gap: compact ? 10 : 14,
        header: Header({}),
      },
      FolderChips({}),
      NewTask({}),
      SearchRow({}),
      state.tags.length > 0 ? TagFilterButton({}) : null,
      TaskList({}),
      TagFilterSheet({}),
      FolderSheet({}),
    ),
  )
})

export const renderApp = () => {
  const covered = ui.editorOpen || ui.syncOpen || ui.viewerPath !== ""

  return Stack(
    { key: "root", fill: true },
    Box({ key: "list", fill: true, visible: !covered }, MainPage({})),
    ui.syncOpen ? SyncPage({}) : null,
    ui.editorOpen ? EditorPage({}) : null,
    ui.viewerPath ? ViewerPage({}) : null,
  )
}
