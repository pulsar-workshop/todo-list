import { Box, Button, Column, Image, Page, Row, Spacer, Text, component } from "pulsar"
import { fileURL, ui } from "../state.ts"
import { backgroundColor, textColor } from "../theme.ts"

export const ViewerPage = component(() => {
  const path = ui.viewerPath

  return Box(
    { key: "viewer", fill: true, color: backgroundColor() },
    Page(
      {
        padding: 8,
        gap: 8,
        header: Row(
          { fillWidth: true, alignItems: "center" },
          Button(
            {
              variant: "ghost",
              icon: "arrow_back",
              onClick: () => (ui.viewerPath = ""),
            },
            "Закрыть",
          ),
          Spacer({ fillWidth: true }),
        ),
      },
      Column(
        { fillWidth: true, gap: 8 },
        Text({
          text: "Просмотр",
          size: 10,
          weight: "medium",
          color: textColor(true),
          letterSpacing: 1.2,
        }),
        Image({
          src: fileURL(path),
          height: 460,
          fillWidth: true,
          fillMode: "PreserveAspectFit",
        }),
      ),
    ),
  )
})
