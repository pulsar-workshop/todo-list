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
import { iconTile, screenMotion } from "./kit.ts"
import { closeSync } from "./state.ts"

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

  const header = () => {
    return (
      <Row gap={6} fillWidth alignItems="center">
        {iconTile({ icon: "arrow_back", tooltip: "Назад", onClick: closeSync })}
        <Text size={20} weight="semibold" color={textColor(false)}>
          Синхронизация
        </Text>
        <Spacer fillWidth />
      </Row>
    )
  }

  const footer = () => {
    return (
      <Row fillWidth>
        <Button fillWidth onClick={() => void save()}>
          Сохранить
        </Button>
      </Row>
    )
  }

  return () => {
    return (
      <Box key="sync" fill color={backgroundColor()} {...screenMotion}>
        <Page padding={16} gap={10} header={header()} footer={footer()}>
          <Text size={10} weight="medium" color={textColor(true)} letterSpacing={1.2}>
            СЕРВЕР
          </Text>
          <Row gap={8} fillWidth>
            <Input
              value={host.get()}
              placeholder="Адрес"
              variant="outline"
              textColor={textColor(false)}
              expand
              onInput={(value) => host.set(value)}
            />
            <Input
              value={port.get()}
              placeholder="Порт"
              variant="outline"
              textColor={textColor(false)}
              width={96}
              onInput={(value) => port.set(value)}
            />
          </Row>
          <Input
            value={password.get()}
            placeholder="Пароль (необязательно)"
            variant="outline"
            textColor={textColor(false)}
            password
            fillWidth
            onInput={(value) => password.set(value)}
            onSubmitted={() => void save()}
          />
          {error.get() ? (
            <Text size={12} color="#ef4444">
              {error.get()}
            </Text>
          ) : null}
          <Text size={12} color={textColor(true)}>
            Пустой адрес выключает синхронизацию.
          </Text>
        </Page>
      </Box>
    )
  }
})
