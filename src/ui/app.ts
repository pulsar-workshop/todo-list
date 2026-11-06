import {
  Box,
  Column,
  Icon,
  KeepAlive,
  Page,
  Row,
  SearchField,
  Spacer,
  Stack,
  Text,
  Wrap,
  component,
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
import { Composer } from "./composer.ts"
import { EditorPage } from "./editor.ts"
import { FolderSheet } from "./folder-sheet.ts"
import { iconTile, pill, screenMotion } from "./kit.ts"
import {
  clearTodoFilters,
  openFolders,
  openSync,
  openTagFilter,
  openTaskCalendar,
} from "./state.ts"
import { SyncPage } from "./sync-dialog.tsx"
import { TagFilterSheet } from "./tag-filter-sheet.ts"
import { TaskCalendarPage } from "./task-calendar.ts"
import { TaskRow } from "./task-row.ts"
import { ViewerPage } from "./viewer.ts"
import { tr } from "../i18n.ts"

const Header = component(() => {
  const compact = breakpoints.is("compact")

  return Row(
    { gap: 2, fillWidth: true, alignItems: "center" },
    Column(
      { gap: 2, flex: 1 },
      Text({
        text: tr("Задачи"),
        size: 22,
        weight: "semibold",
        color: textColor(false),
      }),
      Row(
        { gap: 6, alignItems: "center" },
        Box({ width: 6, height: 6, radius: 3, color: syncColor() }),
        Text({
          text: compact
            ? tr("Осталось {count}", { count: activeCount.get() })
            : tr("Осталось {count} · {sync}", { count: activeCount.get(), sync: syncLabel() }),
          size: 12,
          color: textColor(true),
        }),
      ),
    ),
    compact
      ? null
      : iconTile({
          icon: isDarkTheme() ? "light_mode" : "dark_mode",
          tooltip: tr("Сменить тему"),
          onClick: toggleTheme,
        }),
    iconTile({
      icon: "sync",
      tooltip: tr("Синхронизировать"),
      onClick: () => (state.syncSettings.host ? void syncNow() : openSync()),
    }),
    iconTile({ icon: "settings", tooltip: tr("Настройки"), onClick: openSync }),
    iconTile({
      icon: "calendar_month",
      tooltip: tr("Календарь"),
      onClick: openTaskCalendar,
    }),
  )
})

const folderPill = (key: string, label: string) => {
  return pill({
    key: `folder-${key}`,
    label,
    selected: activeFolder.get() === key,
    onClick: () => {
      ui.folderFilter = key
    },
  })
}

const FolderPills = component(() => {
  return Wrap(
    { gap: 6, fillWidth: true },
    folderPill("", tr("Все")),
    folderPill("none", tr("Без папки")),
    ...state.folders.map((folder) => folderPill(folder.ID, folder.name)),
    iconTile({
      key: "folders",
      icon: "create_new_folder",
      tooltip: tr("Папки"),
      size: 28,
      onClick: openFolders,
    }),
  )
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
      placeholder: tr("Поиск задач"),
      flex: 1,
      fillWidth: true,
      onInput: (value) => {
        ui.todoQuery = value
      },
    }),
    state.tags.length > 0
      ? iconTile({
          icon: "sell",
          tooltip: tr("Теги"),
          badge: activeTags.get().length || undefined,
          onClick: openTagFilter,
        })
      : null,
    filtering
      ? iconTile({
          icon: "filter_alt_off",
          tooltip: tr("Сбросить фильтры"),
          onClick: clearTodoFilters,
        })
      : null,
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
    Column(
      {
        width: 64,
        height: 64,
        radius: 32,
        color: surfaceColor(),
        borderWidth: 1,
        borderColor: borderColor(),
        justify: "center",
        alignItems: "center",
      },
      Icon({ name: "checklist", size: 28, color: textColor(true) }),
    ),
    tr("Пока пусто"),
    tr("Добавьте первую задачу."),
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
    tr("Ничего не найдено"),
    tr("Измените запрос или сбросьте фильтры."),
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

const NewTask = component(() => {
  return Composer({
    placeholder: tr("Что нужно сделать?"),
    autoFocus: ui.newTaskFocus,
    onBlur: () => {
      ui.newTaskFocus = false
    },
    onSubmit: (text) => {
      const folder = activeFolder.peek()

      addTodo({ text, folderID: folder && folder !== "none" ? folder : null })
    },
  })
})

const MainPage = component(() => {
  return Box(
    { key: "main", fill: true, color: backgroundColor() },
    Page(
      {
        padding: 14,
        gap: 10,
        overscroll: false,
        header: Header({}),
        footer: NewTask({}),
      },
      FolderPills({}),
      SearchRow({}),
      TaskList({}),
      TagFilterSheet({}),
      FolderSheet({}),
    ),
  )
})

export const renderApp = () => {
  const covered =
    ui.editorOpen || ui.syncOpen || ui.viewerPath !== "" || ui.taskCalendarOpen

  return Stack(
    { key: "root", fill: true },
    KeepAlive({ key: "list", active: !covered, ...screenMotion }, () => MainPage({})),
    KeepAlive(
      {
        key: "calendar",
        active: ui.taskCalendarOpen && !ui.editorOpen,
        preload: ui.calendarReady,
        ...screenMotion,
      },
      () => TaskCalendarPage({}),
    ),
    ui.syncOpen ? SyncPage({}) : null,
    ui.editorOpen ? EditorPage({}) : null,
    ui.viewerPath ? ViewerPage({}) : null,
  )
}
