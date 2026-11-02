import { Box, Button, Column, Image, Row, Spacer } from "pulsar";
import { fileURL, setUI, uiValue } from "../state.ts";
import { backgroundColor } from "../theme.ts";

export const ViewerPage = () => {
  const path = uiValue("viewerPath", "");

  return Box(
    { fill: true, color: backgroundColor() },
    Column(
      { fill: true, padding: 8, gap: 8 },
      Row(
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
      Image({ src: fileURL(path), fill: true, fillMode: "PreserveAspectFit" }),
    ),
  );
};
