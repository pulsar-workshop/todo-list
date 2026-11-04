import {
  Box,
  Button,
  Input,
  Page,
  Row,
  Spacer,
  Text,
  component,
  signal,
} from "pulsar"
import { DEFAULT_PORT } from "../model.ts"
import { state } from "../state.ts"
import { saveSyncConnection } from "../sync.ts"
import { backgroundColor, textColor } from "../theme.ts"
import { closeSync } from "./state.ts"
import { TOUCH_SCROLL } from "./scroll.ts"

export const SyncPage = component(() => {
  const host = signal(state.syncSettings.host)
  const port = signal(state.syncSettings.port)
  const password = signal(state.syncSettings.password)
  const error = signal("")

  const save = async (): Promise<void> => {
    const portText = port.peek().trim() || DEFAULT_PORT
    const value = Number(portText)

    if (!Number.isInteger(value) || value < 1 || value > 65535) {
      error.set("Порт должен быть от 1 до 65535")

      return
    }

    closeSync()

    await saveSyncConnection({
      host: host.peek().trim(),
      port: portText,
      password: password.peek(),
    })
  }

  return () => {
    return Box(
      { key: "sync", fill: true, color: backgroundColor() },
      Page(
        {
          ...TOUCH_SCROLL,
          padding: 16,
          gap: 10,
          header: Row(
            { gap: 6, fillWidth: true, align: "center" },
            Button(
              { variant: "ghost", icon: "arrow_back", onClick: closeSync },
              "Назад",
            ),
            Text({
              text: "Синхронизация",
              size: 20,
              weight: "semibold",
              color: textColor(false),
            }),
            Spacer({ fillWidth: true }),
          ),
          footer: Row(
            { fillWidth: true },
            Button({ fillWidth: true, onClick: () => void save() }, "Сохранить"),
          ),
        },
        Text({
          text: "СЕРВЕР",
          size: 10,
          weight: "medium",
          color: textColor(true),
          letterSpacing: 1.2,
        }),
        Row(
          { gap: 8, fillWidth: true },
          Input({
            value: host.get(),
            placeholder: "Адрес",
            variant: "outline",
            textColor: textColor(false),
            expand: true,
            onInput: (value) => host.set(value),
          }),
          Input({
            value: port.get(),
            placeholder: "Порт",
            variant: "outline",
            textColor: textColor(false),
            width: 96,
            onInput: (value) => port.set(value),
          }),
        ),
        Input({
          value: password.get(),
          placeholder: "Пароль (необязательно)",
          variant: "outline",
          textColor: textColor(false),
          password: true,
          fillWidth: true,
          onInput: (value) => password.set(value),
          onSubmitted: () => void save(),
        }),
        error.get() ? Text({ text: error.get(), size: 12, color: "#ef4444" }) : null,
        Text({
          text: "Пустой адрес выключает синхронизацию.",
          size: 12,
          color: textColor(true),
        }),
      ),
    )
  }
})
