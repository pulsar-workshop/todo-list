import { app } from "./state.ts"
import { tr } from "./i18n.ts"

export const installMenu = (): void => {
  app.setMenu([
    {
      label: tr("Задача"),
      items: [
        { id: "new-task", label: tr("Новая задача"), shortcut: "Ctrl+N" },
        { id: "sync-now", label: tr("Синхронизировать"), shortcut: "Ctrl+R" },
        { separator: true },
        { id: "settings", label: tr("Настройки…"), shortcut: "Ctrl+," },
        { separator: true },
        { id: "quit", label: tr("Выход"), shortcut: "Ctrl+Q" },
      ],
    },
  ])
}
