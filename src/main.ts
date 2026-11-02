import { openPath } from "./actions.ts"
import { installMenu } from "./menu.ts"
import { watchTheme } from "./theme.ts"
import { app, state } from "./state.ts"
import { loadSyncSettings, restore } from "./storage.ts"
import { pull, push, syncNow } from "./sync.ts"
import { renderApp } from "./ui/app.ts"
import { focusNewTask, handleBack, openSync } from "./ui/state.ts"

app.on("back-pressed", handleBack)
app.on("open-file", (params: { path?: unknown }) => {
  const path = typeof params?.path === "string" ? params.path : ""

  void openPath(path)
})
app.on("menu", (payload: { id?: unknown }) => {
  const id = typeof payload?.id === "string" ? payload.id : ""

  if (id === "new-task") focusNewTask()
  if (id === "settings") openSync()
  if (id === "sync-now") state.syncSettings.host ? void syncNow() : openSync()
  if (id === "quit") app.quit()
})
app.on("notification-action", (payload: { id?: unknown }) => {
  if (payload?.id === "settings") openSync()
})
app.on("notification-click", () => {
  void app.window().show()
  void app.window().focus()
  openSync()
})
app.on("power-resume", () => {
  if (state.syncSettings.host) void syncNow()
})

installMenu()

const start = async (): Promise<void> => {
  await loadSyncSettings()
  await restore()

  await watchTheme()

  app.window("main").render(renderApp)
  app.run()

  if (state.sync.dirty) void push()
  else void pull()

  setInterval(() => {
    if (!state.syncSettings.host) return

    if (state.sync.dirty) void push()
    else void pull()
  }, 4000)
}

void start()
