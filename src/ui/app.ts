import {
  Box,
  Button,
  Card,
  Column,
  EmptyState,
  For,
  Input,
  Row,
  Text,
  When,
} from "pulsar";
import { addTodo } from "../actions.ts";
import { setUI, syncColor, syncLabel, uiValue, app, state } from "../state.ts";
import { syncNow } from "../sync.ts";
import {
  backgroundColor,
  isDarkTheme,
  surfaceColor,
  textColor,
  toggleTheme,
} from "../theme.ts";
import { EditorPage } from "./editor.ts";
import { focusNewTask, openSync } from "./state.ts";
import { SyncPage } from "./sync-dialog.ts";
import { TaskRow } from "./task-row.ts";
import { ViewerPage } from "./viewer.ts";

const submitNewTask = (): void => {
  const text = uiValue("newTaskText", "").trim();

  if (!text) return;

  addTodo({ text });
  setUI("newTaskText", "");
};

const MainPage = () => {
  const todos = state.todos;
  const focus = uiValue("newTaskFocus", false);

  return Box(
    { fill: true, color: backgroundColor() },
    Column(
      { fill: true, maxWidth: 760, align: "center", padding: 20, gap: 14 },
      Row(
        { fillWidth: true, align: "center", gap: 12 },
        Column(
          { gap: 3, expand: true },
          Text({
            text: "Задачи",
            size: 28,
            weight: "bold",
            color: textColor(false),
          }),
          Row(
            { gap: 8, align: "center" },
            Text({
              text: `Осталось: ${app.store.get("activeCount") ?? 0}`,
              size: 12,
              color: textColor(true),
            }),
            Box({ width: 7, height: 7, radius: 4, color: syncColor() }),
            Text({ text: syncLabel(), size: 12, color: syncColor() }),
          ),
        ),
        Button({
          variant: "ghost",
          icon: "sync",
          tooltip: "Синхронизировать",
          onClick: () =>
            state.syncSettings.host ? void syncNow() : openSync(),
        }),
        Button({
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
      ),
      Card(
        { padding: 8, radius: 12, elevation: 1, color: surfaceColor() },
        Row(
          { gap: 8, fillWidth: true, align: "center" },
          Input({
            value: uiValue("newTaskText", ""),
            placeholder: "Что нужно сделать?",
            variant: "outline",
            expand: true,
            autoFocus: focus,
            onInput: (value) => setUI("newTaskText", value),
            onSubmitted: submitNewTask,
            onBlur: () => setUI("newTaskFocus", false),
          }),
          Button({ onClick: submitNewTask }, "Добавить"),
        ),
      ),
      When({
        test: todos.length === 0,
        then: () =>
          EmptyState({
            icon: "checklist",
            title: "Пока пусто",
            text: "Добавьте первую задачу.",
            action: Button({ onClick: focusNewTask }, "Новая задача"),
          }),
        else: () =>
          For({
            each: todos,
            keyOf: (todo) => todo.ID,
            spacing: 8,
            fill: true,
            render: (todo) => TaskRow({ todo }),
          }),
      }),
    ),
  );
};

export const renderApp = () => {
  if (uiValue("editorOpen", false)) return EditorPage();
  if (uiValue("syncOpen", false)) return SyncPage();
  if (uiValue("viewerPath", "")) return ViewerPage();

  return MainPage();
};
