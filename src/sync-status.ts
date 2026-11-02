import { notify, permissions } from "pulsar";
import { isAndroid } from "./platform.ts";
import { app, state } from "./state.ts";

let syncWasOnline = false;
let lastSyncAlertAT = 0;

const notifySyncError = async (): Promise<void> => {
  if (!state.syncSettings.host) return;
  if (Date.now() - lastSyncAlertAT < 60_000) return;

  lastSyncAlertAT = Date.now();

  try {
    if (isAndroid()) {
      await permissions.request("notifications");
      await notify.channel({
        id: "sync",
        name: "Синхронизация",
        importance: 3,
      });
    }

    await notify.show({
      title: "Синхронизация",
      body: "Сервер недоступен",
      actions: [{ id: "settings", title: "Настройки" }],
    });
  } catch {}
};

export const setStatus = (status: string): void => {
  app.store.set("syncStatus", status);
  app.store.set("syncHost", state.syncSettings.host);
  app.store.set("syncPort", state.syncSettings.port);
  app.store.set("syncPassword", state.syncSettings.password);

  if (status === "ok") {
    syncWasOnline = true;
    return;
  }

  if (status === "error" && syncWasOnline) {
    syncWasOnline = false;
    void notifySyncError();
  }
};
