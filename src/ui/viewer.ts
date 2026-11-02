import { Box, Button, Column, Image, Page, Row, Spacer, Text } from "pulsar"
import { fileURL, setUI, uiValue } from "../state.ts"
import { backgroundColor, textColor } from "../theme.ts"

export const ViewerPage = () => {
  const path = uiValue("viewerPath", "")

  return Box(
    { fill: true, color: backgroundColor() },
    Page(
      {
        padding: 8,
        gap: 8,
        header: Row(
          { fillWidth: true, align: "center" },
          Button(
            {
              variant: "ghost",
              icon: "arrow_back",
              onClick: () => setUI("viewerPath", ""),
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
}
