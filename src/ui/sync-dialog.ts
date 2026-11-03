import { Box, Button, Column, Input, Page, Row, Spacer, Text } from "pulsar"
import { setUI, uiValue } from "../state.ts"
import { backgroundColor, textColor } from "../theme.ts"
import { closeSync, saveSyncForm } from "./state.ts"

export const SyncPage = () =>
  Box(
    { key: "sync", fill: true, color: backgroundColor() },
    Page(
      {
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
          Button({ onClick: () => void saveSyncForm() }, "Сохранить"),
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
          value: uiValue("syncHostInput", ""),
          placeholder: "Адрес",
          variant: "outline",
          textColor: textColor(false),
          expand: true,
          onInput: (value) => setUI("syncHostInput", value),
        }),
        Input({
          value: uiValue("syncPortInput", "8787"),
          placeholder: "Порт",
          variant: "outline",
          textColor: textColor(false),
          width: 96,
          onInput: (value) => setUI("syncPortInput", value),
        }),
      ),
      Input({
        value: uiValue("syncPasswordInput", ""),
        placeholder: "Пароль (необязательно)",
        variant: "outline",
        textColor: textColor(false),
        password: true,
        fillWidth: true,
        onInput: (value) => setUI("syncPasswordInput", value),
        onSubmitted: () => void saveSyncForm(),
      }),
      uiValue("syncError", "")
        ? Text({ text: uiValue("syncError", ""), size: 12, color: "#ef4444" })
        : null,
      Text({
        text: "Пустой адрес выключает синхронизацию.",
        size: 12,
        color: textColor(true),
      }),
    ),
  )
