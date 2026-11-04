import {
  Button,
  Column,
  Divider,
  IconButton,
  Input,
  Row,
  Sheet,
  Text,
} from "pulsar"
import { deleteFolder } from "../actions.ts"
import { setUI, state, uiValue } from "../state.ts"
import { textColor } from "../theme.ts"
import {
  cancelRenameFolder,
  closeFolders,
  confirmRenameFolder,
  createFolder,
  startRenameFolder,
} from "./state.ts"

export const FolderSheet = () => {
  const renameID = uiValue("folderRenameID", "")

  return Sheet(
    {
      open: true,
      title: "Папки",
      onClose: closeFolders,
    },
    state.folders.length > 0
      ? Column(
          { gap: 8, fillWidth: true },
          ...state.folders.map((folder) =>
            renameID === folder.ID
              ? Row(
                  { gap: 6, fillWidth: true, align: "center" },
                  Input({
                    value: uiValue("folderRenameText", ""),
                    variant: "outline",
                    textColor: textColor(false),
                    expand: true,
                    onInput: (value) => setUI("folderRenameText", value),
                    onSubmitted: confirmRenameFolder,
                  }),
                  Button({ onClick: confirmRenameFolder }, "ОК"),
                  IconButton({
                    icon: "close",
                    tooltip: "Отмена",
                    onClick: cancelRenameFolder,
                  }),
                )
              : Row(
                  { gap: 4, fillWidth: true, align: "center" },
                  Text({
                    text: folder.name,
                    size: 15,
                    color: textColor(false),
                    fillWidth: true,
                    expand: true,
                    maxLines: 1,
                    elide: "right",
                  }),
                  IconButton({
                    icon: "edit",
                    tooltip: "Переименовать",
                    onClick: () => startRenameFolder(folder),
                  }),
                  IconButton({
                    icon: "delete",
                    tooltip: "Удалить папку",
                    onClick: () => void deleteFolder({ ID: folder.ID }),
                  }),
                ),
          ),
        )
      : Text({ text: "Папок пока нет.", size: 12, color: textColor(true) }),
    Divider(),
    Row(
      { gap: 8, fillWidth: true, align: "center" },
      Input({
        value: uiValue("folderName", ""),
        placeholder: "Новая папка",
        variant: "outline",
        textColor: textColor(false),
        expand: true,
        onInput: (value) => setUI("folderName", value),
        onSubmitted: createFolder,
      }),
      Button({ onClick: createFolder }, "Создать"),
    ),
    Button({ variant: "ghost", onClick: closeFolders }, "Готово"),
  )
}
