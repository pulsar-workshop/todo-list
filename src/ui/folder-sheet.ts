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
import { tr } from "../i18n.ts"

export const FolderSheet = component(() => {
  const renameID = ui.folderRenameID

  return Sheet(
    {
      open: ui.foldersOpen,
      title: tr("Папки"),
      onClose: closeFolders,
    },
    state.folders.length > 0
      ? Column(
          { gap: 8, fillWidth: true },
          ...state.folders.map((folder) =>
            renameID === folder.ID
              ? Row(
                  { key: folder.ID, gap: 6, fillWidth: true, alignItems: "center" },
                  Input({
                    value: ui.folderRenameText,
                    variant: "outline",
                    textColor: textColor(false),
                    expand: true,
                    onInput: (value) => (ui.folderRenameText = value),
                    onSubmitted: confirmRenameFolder,
                  }),
                  Button({ onClick: confirmRenameFolder }, tr("ОК")),
                  IconButton({
                    icon: "close",
                    tooltip: tr("Отмена"),
                    onClick: cancelRenameFolder,
                  }),
                )
              : Row(
                  { key: folder.ID, gap: 4, fillWidth: true, alignItems: "center" },
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
                    tooltip: tr("Переименовать"),
                    onClick: () => startRenameFolder(folder),
                  }),
                  IconButton({
                    icon: "delete",
                    tooltip: tr("Удалить папку"),
                    onClick: () => void deleteFolder({ ID: folder.ID }),
                  }),
                ),
          ),
        )
      : Text({ text: tr("Папок пока нет."), size: 12, color: textColor(true) }),
    Divider(),
    Row(
      { gap: 8, fillWidth: true, alignItems: "center" },
      Input({
        value: ui.folderName,
        placeholder: tr("Новая папка"),
        variant: "outline",
        textColor: textColor(false),
        expand: true,
        onInput: (value) => (ui.folderName = value),
        onSubmitted: createFolder,
      }),
      Button({ onClick: createFolder }, tr("Создать")),
    ),
    Button({ variant: "ghost", onClick: closeFolders }, tr("Готово")),
  )
})
