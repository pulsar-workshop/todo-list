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
  Text,
  When,
  Wrap,
} from "pulsar"
import { addTodo, deleteFolder } from "../actions.ts"
import {
  breakpoints,
  setUI,
  syncColor,
  syncLabel,
  uiValue,
  app,
  state,
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
import { EditorPage } from "./editor.ts"
import {
  clearTodoFilters,
  createFolder,
  openSync,
  openTagFilter,
  toggleFilterTag,
} from "./state.ts"
import { SyncPage } from "./sync-dialog.ts"
import { TagChip } from "./tag-chip.ts"
import { TagFilterSheet } from "./tag-filter-sheet.ts"
import { TaskRow } from "./task-row.ts"
import type { Todo } from "../types.ts"
import { ViewerPage } from "./viewer.ts"

const submitNewTask = (): void => {
  const text = uiValue("newTaskText", "").trim()

  if (!text) return

  const filter = uiValue<string>("folderFilter", "")
  const folderID = filter && filter !== "none" ? filter : null

  addTodo({ text, folderID })
  setUI("newTaskText", "")
}

const HeaderRow = (compact: boolean) => {
  const focus = uiValue("newTaskFocus", false)

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
        { gap: 8, align: "center" },
        Text({
          text: `Осталось: ${app.store.get("activeCount") ?? 0}`,
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
}

const EmptyStateView = () =>
  Column(
    { gap: 10, padding: 24, align: "center", fillWidth: true },
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
    Text({
      text: "Пока пусто",
      size: 17,
      weight: "semibold",
      color: textColor(false),
      align: "center",
      fillWidth: true,
    }),
    Text({
      text: "Добавьте первую задачу.",
      size: 13,
      color: textColor(true),
      align: "center",
      wrap: true,
      fillWidth: true,
    }),
  )

const MainPage = () => {
  const compact = breakpoints.is("compact")
  const query = uiValue("todoQuery", "").trim().toLowerCase()
  const filterIDs = uiValue<string[]>("filterTags", [])
  const storedFolder = uiValue<string>("folderFilter", "")
  const folderFilter =
    storedFolder === "none" ||
    state.folders.some((folder) => folder.ID === storedFolder)
      ? storedFolder
      : ""
  const folderCreating = uiValue("folderCreating", false)
  const selectedTags = state.tags.filter((tag) => filterIDs.includes(tag.ID))
  const matchesTodo = (todo: Todo): boolean => {
    if (folderFilter === "none" && todo.folderID) return false
    if (folderFilter && folderFilter !== "none" && todo.folderID !== folderFilter)
      return false
    if (filterIDs.length > 0 && !todo.tags.some((ID) => filterIDs.includes(ID)))
      return false

    if (!query) return true

    return `${todo.text}\n${todo.description}`.toLowerCase().includes(query)
  }

  const todos = state.todos.filter(matchesTodo)
  const filtering = query.length > 0 || filterIDs.length > 0 || folderFilter !== ""
  const focus = uiValue("newTaskFocus", false)

  return Box(
    { key: "main", fill: true, color: backgroundColor() },
    Page(
      {
        padding: compact ? 14 : 20,
        gap: compact ? 10 : 14,
        header: HeaderRow(compact),
      },
      Wrap(
        { gap: 6, fillWidth: true },
        Chip(
          {
            variant: "outline",
            color: folderFilter === "" ? textColor(false) : textColor(true),
            selected: folderFilter === "",
            selectedColor: textColor(false),
            onClick: () => setUI("folderFilter", ""),
          },
          "Все",
        ),
        Chip(
          {
            variant: "outline",
            color: folderFilter === "none" ? textColor(false) : textColor(true),
            selected: folderFilter === "none",
            selectedColor: textColor(false),
            onClick: () => setUI("folderFilter", "none"),
          },
          "Без папки",
        ),
        ...state.folders.map((folder) =>
          Chip(
            {
              variant: "outline",
              color: folderFilter === folder.ID ? textColor(false) : textColor(true),
              selected: folderFilter === folder.ID,
              selectedColor: textColor(false),
              tooltip: "Удерживайте, чтобы удалить папку",
              onClick: () => setUI("folderFilter", folder.ID),
              onLongPress: () => void deleteFolder({ ID: folder.ID }),
            },
            folder.name,
          ),
        ),
        Button({
          variant: "ghost",
          icon: "create_new_folder",
          size: "sm",
          tooltip: "Новая папка",
          onClick: () => setUI("folderCreating", !folderCreating),
        }),
      ),
      folderCreating
        ? Row(
            { gap: 8, fillWidth: true, align: "center" },
            Input({
              value: uiValue("folderName", ""),
              placeholder: "Название папки",
              variant: "outline",
              textColor: textColor(false),
              expand: true,
              autoFocus: true,
              onInput: (value) => setUI("folderName", value),
              onSubmitted: createFolder,
            }),
            Button({ onClick: createFolder }, "Создать"),
          )
        : null,
      Card(
        {
          padding: 8,
          radius: 10,
          elevation: 0,
          color: surfaceColor(),
          borderColor: borderColor(),
          borderWidth: 1,
        },
        Row(
          { gap: 8, fillWidth: true, align: "center" },
          Input({
            value: uiValue("newTaskText", ""),
            placeholder: "Что нужно сделать?",
            variant: "outline",
            textColor: textColor(false),
            expand: true,
            autoFocus: focus,
            onInput: (value) => setUI("newTaskText", value),
            onSubmitted: submitNewTask,
            onBlur: () => setUI("newTaskFocus", false),
          }),
          Button({ onClick: submitNewTask }, "Добавить"),
        ),
      ),
      Row(
        { gap: 8, fillWidth: true, align: "center" },
        SearchField({
          value: uiValue("todoQuery", ""),
          placeholder: "Поиск задач",
          fillWidth: true,
          onInput: (value) => setUI("todoQuery", value),
        }),
        filtering
          ? Button(
              {
                variant: "ghost",
                size: "sm",
                onClick: clearTodoFilters,
              },
              "Сбросить",
            )
          : null,
      ),
      state.tags.length > 0
        ? Row(
            { gap: 8, fillWidth: true, align: "center" },
            Button(
              {
                variant: "outline",
                icon: "sell",
                onClick: openTagFilter,
              },
              filterIDs.length > 0 ? `Теги · ${filterIDs.length}` : "Теги",
            ),
          )
        : null,
      filterIDs.length > 0
        ? Wrap(
            { gap: 6, fillWidth: true },
            ...selectedTags.map((tag) =>
              TagChip({
                tag,
                selected: true,
                onClick: () => toggleFilterTag(tag.ID),
              }),
            ),
          )
        : null,
      Column(
        { gap: 8, fillWidth: true, visible: todos.length > 0 },
        ...state.todos.map((todo) =>
          TaskRow({ todo, visible: matchesTodo(todo) }),
        ),
      ),
      When({
        test: todos.length === 0,
        then: () =>
          state.todos.length === 0
            ? EmptyStateView()
            : Column(
                { gap: 10, padding: 24, align: "center", fillWidth: true },
                Icon({ name: "search_off", size: 32, color: textColor(true) }),
                Text({
                  text: "Ничего не найдено",
                  size: 17,
                  weight: "semibold",
                  color: textColor(false),
                  align: "center",
                  fillWidth: true,
                }),
                Text({
                  text: "Измените запрос или сбросьте фильтры.",
                  size: 13,
                  color: textColor(true),
                  align: "center",
                  wrap: true,
                  fillWidth: true,
                }),
                Button({ onClick: clearTodoFilters }, "Сбросить"),
              ),
      }),
      uiValue("tagFilterOpen", false) ? TagFilterSheet() : null,
    ),
  )
}

export const renderApp = () => {
  if (uiValue("editorOpen", false)) return EditorPage()
  if (uiValue("syncOpen", false)) return SyncPage()
  if (uiValue("viewerPath", "")) return ViewerPage()

  return MainPage()
}
