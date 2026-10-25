import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import Pulsar 1.0

ApplicationWindow {
    id: window

    visible: true
    width: 640
    height: 520
    title: "Todo List"
    color: "#f5f5f7"

    function tagByID(ID) {
        const list = Store.tags ?? []

        return list.find((tag) => tag.ID === ID) ?? { name: ID, color: "#64748b" }
    }

    function formatDate(value) {
        return Qt.formatDateTime(new Date(value), "dd.MM.yyyy HH:mm")
    }

    function formatDates(todo) {
        if (todo.startAT !== null && todo.endAT !== null) {
            return "с " + formatDate(todo.startAT) + " до " + formatDate(todo.endAT)
        }

        if (todo.endAT !== null) return "до " + formatDate(todo.endAT)
        if (todo.startAT !== null) return "с " + formatDate(todo.startAT)

        return ""
    }

    function subtaskLabel(todo) {
        if (!todo.subtasks || todo.subtasks.length === 0) return ""

        const done = todo.subtasks.filter((subtask) => subtask.done).length

        return "Подзадачи: " + done + "/" + todo.subtasks.length
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 24
        spacing: 12

        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            ColumnLayout {
                spacing: 2

                Label {
                    text: "Задачи"
                    color: "#1d1d1f"
                    font.pixelSize: 28
                    font.bold: true
                }

                Label {
                    text: "Осталось: " + (Store.activeCount ?? 0)
                    color: "#8e8e96"
                    font.pixelSize: 14
                }

                Label {
                    text: window.syncLabel()
                    color: window.syncColor()
                    font.pixelSize: 12
                }
            }

            Item {
                Layout.fillWidth: true
            }

            Button {
                text: "Настройки"
                flat: true
                onClicked: syncDialog.openDialog()
            }
        }

        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            TextField {
                id: input

                Layout.fillWidth: true
                placeholderText: "Что нужно сделать?"
                font.pixelSize: 16
                onAccepted: window.addTask()
            }

            Button {
                text: "Добавить"
                onClicked: window.addTask()
            }
        }

        ListView {
            id: list

            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true
            spacing: 6
            model: Store.todos ?? []

            TapHandler {
                onTapped: input.focus = false
            }

            delegate: Rectangle {
                id: row

                required property var modelData

                width: list.width
                height: layout.implicitHeight + 24
                radius: 12
                color: "#ffffff"
                border.width: 1
                border.color: "#ececf0"

                ColumnLayout {
                    id: layout

                    anchors.fill: parent
                    anchors.margins: 12
                    spacing: 8

                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 8

                        CheckBox {
                            checked: row.modelData.done
                            Layout.alignment: Qt.AlignTop
                            onClicked: Pulsar.emit("toggle-todo", { ID: row.modelData.ID })
                        }

                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 4

                            TapHandler {
                                onTapped: window.editTask(row.modelData)
                            }

                            Label {
                                Layout.fillWidth: true
                                text: row.modelData.text
                                color: row.modelData.done ? "#a1a1a9" : "#1d1d1f"
                                font.pixelSize: 16
                                font.bold: true
                                font.strikeout: row.modelData.done
                                wrapMode: Text.Wrap
                                maximumLineCount: 2
                                elide: Text.ElideRight
                            }

                            Label {
                                Layout.fillWidth: true
                                visible: row.modelData.description !== ""
                                text: row.modelData.description
                                color: row.modelData.done ? "#b6b6bd" : "#8e8e96"
                                font.pixelSize: 13
                                wrapMode: Text.Wrap
                                maximumLineCount: 2
                                elide: Text.ElideRight
                            }

                            ColumnLayout {
                                Layout.fillWidth: true
                                spacing: 2

                                Label {
                                    Layout.fillWidth: true
                                    text: "Создано: " + window.formatDate(row.modelData.createdAT)
                                    color: "#a1a1a9"
                                    font.pixelSize: 12
                                    elide: Text.ElideRight
                                }

                                Label {
                                    Layout.fillWidth: true
                                    visible: row.modelData.completedAT != null
                                    text: row.modelData.completedAT != null
                                        ? "Завершено: " + window.formatDate(row.modelData.completedAT)
                                        : ""
                                    color: "#a1a1a9"
                                    font.pixelSize: 12
                                    elide: Text.ElideRight
                                }

                                Label {
                                    Layout.fillWidth: true
                                    visible: row.modelData.startAT !== null || row.modelData.endAT !== null
                                    text: window.formatDates(row.modelData)
                                    color: "#a1a1a9"
                                    font.pixelSize: 12
                                    elide: Text.ElideRight
                                }

                                Label {
                                    Layout.fillWidth: true
                                    visible: row.modelData.subtasks.length > 0
                                    text: window.subtaskLabel(row.modelData)
                                    color: "#a1a1a9"
                                    font.pixelSize: 12
                                    elide: Text.ElideRight
                                }

                                Label {
                                    Layout.fillWidth: true
                                    visible: row.modelData.files.length > 0
                                    text: "Файлов: " + row.modelData.files.length
                                    color: "#a1a1a9"
                                    font.pixelSize: 12
                                    elide: Text.ElideRight
                                }
                            }
                        }

                        Label {
                            text: "›"
                            color: "#c7c7cc"
                            font.pixelSize: 22
                            Layout.alignment: Qt.AlignTop
                        }
                    }

                    Flow {
                        Layout.fillWidth: true
                        Layout.preferredHeight: childrenRect.height
                        Layout.topMargin: 2
                        spacing: 6
                        visible: row.modelData.tags.length > 0

                        Repeater {
                            model: row.modelData.tags

                            delegate: TagChip {
                                required property var modelData

                                label: window.tagByID(modelData).name
                                chipColor: window.tagByID(modelData).color
                                selected: true
                                maxWidth: row.width - 32
                            }
                        }
                    }
                }
            }
        }

        Label {
            Layout.alignment: Qt.AlignHCenter
            visible: (Store.todos ?? []).length === 0
            text: "Пока пусто"
            color: "#a1a1a9"
        }
    }

    TaskEditor {
        id: editor

        onSaveRequested: (json) => Pulsar.emit("save-task", { json })
        onDeleteRequested: (ID) => Pulsar.emit("delete-todo", { ID })
        onAddTagRequested: (name, color) => Pulsar.emit("add-tag", { name, color })
        onPickFilesRequested: (ID) => Pulsar.emit("pick-files", { ID })
        onRemoveFileRequested: (ID, path) => Pulsar.emit("remove-file", { ID, path })
        onExportFileRequested: (path, name) => Pulsar.emit("export-file", { path, name })
        onOpenFileRequested: (path) => Pulsar.emit("open-file", { path })
    }

    Connections {
        target: Qt.inputMethod

        function onVisibleChanged() {
            if (!Qt.inputMethod.visible) keyboardHideTimer.restart()
        }
    }

    Timer {
        id: keyboardHideTimer

        interval: 250

        onTriggered: {
            if (!Qt.inputMethod.visible && input.activeFocus) input.focus = false
        }
    }

    Connections {
        target: Pulsar

        function onAppEvent(event, payload) {
            if (!payload) return

            if (event === "back-pressed") {
                if (editor.shown) {
                    if (!editor.closeViewer()) editor.close()

                    return
                }

                if (syncDialog.visible) syncDialog.close()

                return
            }

            if (event === "tag-added") editor.attachTag(payload.tag)
            if (event === "task-files" && editor.draft && payload.ID === editor.draft.ID) editor.attachFiles(payload.files)
        }
    }

    Dialog {
        id: syncDialog

        parent: Overlay.overlay
        modal: true
        title: "Синхронизация"
        width: Math.min(window.width - 32, 420)
        height: Math.min(Overlay.overlay.height - 40, 360)
        x: (Overlay.overlay.width - width) / 2
        y: Math.max(8, (Overlay.overlay.height - height) / 2 - (Qt.inputMethod.visible ? Qt.inputMethod.keyboardRectangle.height / 2 : 0))
        padding: 16

        function openDialog() {
            input.focus = false
            hostInput.text = Store.syncHost ?? ""
            portInput.text = Store.syncPort ?? "8787"
            passwordInput.text = Store.syncPassword ?? ""
            syncError.visible = false
            open()
        }

        function save() {
            const text = portInput.text.trim()
            const port = Number(text)

            if (!Number.isInteger(port) || port < 1 || port > 65535) {
                syncError.text = "Порт должен быть от 1 до 65535"
                syncError.visible = true
                return
            }

            Pulsar.emit("save-sync", { host: hostInput.text, port: text, password: passwordInput.text })
            close()
        }

        contentItem: ColumnLayout {
            spacing: 4

            RowLayout {
                Layout.fillWidth: true
                spacing: 8

                TextField {
                    id: hostInput

                    Layout.fillWidth: true
                    placeholderText: "Адрес сервера"
                    font.pixelSize: 14
                }

                TextField {
                    id: portInput

                    Layout.preferredWidth: 96
                    placeholderText: "Порт"
                    font.pixelSize: 14
                    inputMethodHints: Qt.ImhDigitsOnly
                    onAccepted: syncDialog.save()
                }
            }

            TextField {
                id: passwordInput

                Layout.fillWidth: true
                placeholderText: "Пароль (необязательно)"
                font.pixelSize: 14
                echoMode: TextInput.Password
                onAccepted: syncDialog.save()
            }

            Label {
                id: syncError

                visible: false
                color: "#ef4444"
                font.pixelSize: 12
            }

            Label {
                Layout.fillWidth: true
                text: "Пустой адрес выключает синхронизацию."
                color: "#8e8e96"
                font.pixelSize: 12
                wrapMode: Text.WordWrap
            }
        }

        footer: Item {
            implicitHeight: 56

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 16
                anchors.rightMargin: 16
                anchors.bottomMargin: 4
                spacing: 8

                Item {
                    Layout.fillWidth: true
                }

                Button {
                    text: "Отмена"
                    onClicked: syncDialog.close()
                }

                Button {
                    text: "Сохранить"
                    onClicked: syncDialog.save()
                }
            }
        }

    }

    function syncLabel() {
        const status = Store.syncStatus ?? "off"

        if (status === "ok") return "Синхронизировано"
        if (status === "error") return "Сервер недоступен"
        if (status === "idle") return "Ожидание"

        return "Синхронизация выключена"
    }

    function syncColor() {
        const status = Store.syncStatus ?? "off"

        if (status === "ok") return "#22c55e"
        if (status === "error") return "#ef4444"

        return "#a1a1a9"
    }

    function addTask() {
        if (input.text.trim().length === 0) return

        Pulsar.emit("add-todo", { text: input.text })
        input.text = ""
    }

    function editTask(todo) {
        input.focus = false
        editor.openFor(todo, Store.tags ?? [])
    }

}
