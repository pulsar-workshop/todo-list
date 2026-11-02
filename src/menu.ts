import { app } from "./state.ts";

export const installMenu = (): void => {
  app.setMenu([
    {
      label: "Задача",
      items: [
        { id: "new-task", label: "Новая задача", shortcut: "Ctrl+N" },
        { id: "sync-now", label: "Синхронизировать", shortcut: "Ctrl+R" },
        { separator: true },
        { id: "settings", label: "Настройки…", shortcut: "Ctrl+," },
        { separator: true },
        { id: "quit", label: "Выход", shortcut: "Ctrl+Q" },
      ],
    },
  ]);
};
