import {
  Button,
  Column,
  Divider,
  IconButton,
  Input,
  Row,
  Sheet,
  Text,
  component,
} from "pulsar"
import { deleteFolder } from "../actions.ts"
import { state, ui } from "../state.ts"
import { textColor } from "../theme.ts"
import {
  cancelRenameFolder,
  closeFolders,
  confirmRenameFolder,
  createFolder,
  startRenameFolder,
} from "./state.ts"

export const FolderSheet = component(() => {
  const renameID = ui.folderRenameID

  return Sheet(
    {
      open: ui.foldersOpen,
      title: "Папки",
      onClose: closeFolders,
    },
    state.folders.length > 0
      ? Column(
          { gap: 8, fillWidth: true },
          ...state.folders.map((folder) =>
            renameID === folder.ID
              ? Row(
                  { key: folder.ID, gap: 6, fillWidth: true, align: "center" },
                  Input({
                    value: ui.folderRenameText,
                    variant: "outline",
                    textColor: textColor(false),
                    expand: true,
                    onInput: (value) => (ui.folderRenameText = value),
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
                  { key: folder.ID, gap: 4, fillWidth: true, align: "center" },
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
        value: ui.folderName,
        placeholder: "Новая папка",
        variant: "outline",
        textColor: textColor(false),
        expand: true,
        onInput: (value) => (ui.folderName = value),
        onSubmitted: createFolder,
      }),
      Button({ onClick: createFolder }, "Создать"),
    ),
    Button({ variant: "ghost", onClick: closeFolders }, "Готово"),
  )
})
