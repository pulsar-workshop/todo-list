import { clipboard, dialog, fs, paths, share } from "pulsar";
import {
  attachmentKey,
  baseName,
  isVideo,
  newID,
  parseTodo,
  todoAsText,
} from "./model.ts";
import { persistState } from "./storage.ts";
import { deleteRemoteFile, push } from "./sync.ts";
import { app, refresh, state } from "./state.ts";
import type { Attachment, Tag, Todo } from "./types.ts";

const save = (): void => {
  state.sync.dirty = true;
  void persistState();
  void push();
};

export const addTodo = (params: { text?: unknown }): void => {
  const text = typeof params?.text === "string" ? params.text.trim() : "";

  if (!text) return;

  state.todos = [
    ...state.todos,
    {
      ID: newID(),
      text,
      description: "",
      done: false,
      createdAT: Date.now(),
      updatedAT: Date.now(),
      completedAT: null,
      startAT: null,
      endAT: null,
      createdAllDay: false,
      completedAllDay: false,
      startAllDay: false,
      endAllDay: false,
      tags: [],
      subtasks: [],
      files: [],
    },
  ];

  refresh();
  save();
};

export const saveTask = (params: { json?: unknown; task?: unknown }): void => {
  let value: unknown = params?.task;

  if (typeof params?.json === "string") {
    try {
      value = JSON.parse(params.json);
    } catch {
      return;
    }
  }

  const task = parseTodo(value);

  if (!task) return;
  if (state.deletedTodos[task.ID]) return;

  task.updatedAT = Date.now();

  const exists = state.todos.some((todo) => todo.ID === task.ID);

  state.todos = exists
    ? state.todos.map((todo) => (todo.ID === task.ID ? task : todo))
    : [...state.todos, task];

  refresh();
  save();
};

export const toggleTodo = (params: { ID?: unknown }): void => {
  const ID = typeof params?.ID === "string" ? params.ID : "";

  if (!ID) return;

  const target = state.todos.find((todo) => todo.ID === ID);

  if (!target) return;

  const done = !target.done;

  state.todos = state.todos.map((todo) => {
    if (todo.ID !== ID) return todo;

    return {
      ...todo,
      done,
      updatedAT: Date.now(),
      completedAT: done ? Date.now() : null,
      completedAllDay: false,
    };
  });

  refresh();
  save();
};

export const deleteTodo = async (params: { ID?: unknown }): Promise<void> => {
  const ID = typeof params?.ID === "string" ? params.ID : "";

  if (!ID) return;

  state.deletedTodos = { ...state.deletedTodos, [ID]: Date.now() };
  state.todos = state.todos.filter((todo) => todo.ID !== ID);

  refresh();
  save();

  try {
    const dirs = await paths.get();

    await fs.remove(`${dirs.data}/attachments/${ID}`, true);
  } catch {}
};

export const addTag = (params: {
  name?: unknown;
  color?: unknown;
}): Tag | null => {
  const name = typeof params?.name === "string" ? params.name.trim() : "";
  const color = typeof params?.color === "string" ? params.color : "#3b82f6";

  if (!name) return null;

  const existing = state.tags.find(
    (tag) => tag.name.toLowerCase() === name.toLowerCase(),
  );

  if (existing) return existing;

  const tag: Tag = { ID: newID(), name, color, updatedAT: Date.now() };

  state.tags = [...state.tags, tag];

  refresh();
  save();

  return tag;
};

export const pickFiles = async (params: {
  ID?: unknown;
}): Promise<Attachment[]> => {
  const ID = typeof params?.ID === "string" ? params.ID : "";

  if (!ID) return [];

  const dirs = await paths.get();
  let picked: string[] = [];

  try {
    picked = await dialog.openFiles({
      title: "Прикрепить файлы",
      dir: dirs.home,
      filter: "All files (*)",
    });
  } catch {
    return [];
  }

  if (picked.length === 0) return [];

  const target = `${dirs.data}/attachments/${ID}`;
  const added: Attachment[] = [];

  try {
    await fs.mkdir(target);
  } catch {}

  for (const source of picked) {
    const name = source.split(/[\\/]/).pop() ?? source;
    const destination = `${target}/${Date.now()}-${name}`;

    try {
      await fs.copy(source, destination);

      let size: number | undefined;
      let modifiedAT: number | undefined;

      try {
        const info = await fs.stat(destination);

        size = info.size;
        modifiedAT = info.mtimeMs;
      } catch {}

      const attachment: Attachment = {
        name,
        path: destination,
        key: `${ID}/${baseName(destination)}`,
      };

      if (size !== undefined) attachment.size = size;
      if (modifiedAT !== undefined) attachment.modifiedAT = modifiedAT;

      added.push(attachment);
    } catch {}
  }

  if (added.length === 0) return [];

  state.todos = state.todos.map((todo) =>
    todo.ID === ID
      ? { ...todo, updatedAT: Date.now(), files: [...todo.files, ...added] }
      : todo,
  );

  refresh();
  save();

  return added;
};

export const removeFile = (params: { ID?: unknown; path?: unknown }): void => {
  const ID = typeof params?.ID === "string" ? params.ID : "";
  const path = typeof params?.path === "string" ? params.path : "";

  if (!ID || !path) return;

  const target = state.todos.find((todo) => todo.ID === ID);
  const file = target?.files.find((item) => item.path === path);
  const key = file ? attachmentKey(ID, file) : "";

  state.todos = state.todos.map((todo) => {
    if (todo.ID !== ID) return todo;

    return {
      ...todo,
      updatedAT: Date.now(),
      files: todo.files.filter((item) => item.path !== path),
    };
  });

  refresh();
  save();

  void fs.remove(path).catch(() => false);
  void deleteRemoteFile(key);
};

export const copyTodo = async (params: { ID?: unknown }): Promise<void> => {
  const ID = typeof params?.ID === "string" ? params.ID : "";
  const todo = state.todos.find((item) => item.ID === ID);

  if (!todo) return;

  try {
    await clipboard.write(todoAsText(todo, state.tags));
    await dialog.toast("Скопировано");
  } catch {}
};

export const shareTodo = async (params: { ID?: unknown }): Promise<void> => {
  const ID = typeof params?.ID === "string" ? params.ID : "";
  const todo = state.todos.find((item) => item.ID === ID);

  if (!todo) return;

  try {
    await share.text(todoAsText(todo, state.tags), {
      title: "Поделиться задачей",
    });
  } catch {}
};

export const exportAttachment = async (
  path: string,
  name: string,
): Promise<void> => {
  if (!path) return;

  try {
    const ok = await fs.exportTo(path, name);

    if (ok) await dialog.toast("Скачано");
  } catch {}
};

export const openPath = async (path: string): Promise<void> => {
  if (!path) return;

  app.addRecentDocument(path);

  try {
    await fs.open(path);

    return;
  } catch {}

  if (typeof Bun === "undefined" || typeof process === "undefined") return;

  if (process.platform === "linux" && isVideo(path)) {
    try {
      Bun.spawn(["mpv", "--fs", "--force-window=yes", path], {
        stdout: "ignore",
        stderr: "ignore",
      });

      return;
    } catch {}
  }

  const command =
    process.platform === "darwin"
      ? ["open", path]
      : process.platform === "win32"
        ? ["cmd", "/c", "start", "", path]
        : ["xdg-open", path];

  try {
    Bun.spawn(command, { stdout: "ignore", stderr: "ignore" });
  } catch {}
};
