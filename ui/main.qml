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

    TapHandler {
        onTapped: (eventPoint) => {
            const point = input.mapFromItem(window.contentItem, eventPoint.position.x, eventPoint.position.y)

            if (input.contains(point)) return

            input.focus = false
        }
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
            spacing: 4
            model: Store.todos ?? []

            TapHandler {
                onTapped: input.focus = false
            }

            delegate: Rectangle {
                id: row

                required property var modelData

                width: list.width
                height: 60
                radius: 8
                color: "#ffffff"

                RowLayout {
                    anchors.fill: parent
                    anchors.leftMargin: 12
                    anchors.rightMargin: 8
                    spacing: 8

                    CheckBox {
                        checked: row.modelData.done
                        onClicked: Pulsar.emit("toggle-todo", { ID: row.modelData.ID })
                    }

                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 0

                        Label {
                            Layout.fillWidth: true
                            text: row.modelData.text
                            color: row.modelData.done ? "#a1a1a9" : "#1d1d1f"
                            font.pixelSize: 15
                            font.strikeout: row.modelData.done
                            elide: Text.ElideRight
                        }

                        RowLayout {
                            Layout.fillWidth: true
                            spacing: 12

                            Label {
                                id: createdLabel

                                text: "Создано: " + Qt.formatDate(new Date(row.modelData.createdAT), "dd.MM.yyyy")
                                color: createdHover.hovered ? "#3b82f6" : "#a1a1a9"
                                font.pixelSize: 12

                                HoverHandler {
                                    id: createdHover
                                }

                                MouseArea {
                                    anchors.fill: parent
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: window.editDate(row.modelData.ID, row.modelData.createdAT)
                                }

                                ToolTip.visible: createdHover.hovered
                                ToolTip.text: "Изменить дату"
                            }

                            Label {
                                visible: row.modelData.completedAT !== null
                                text: "Выполнено: " + Qt.formatDate(new Date(row.modelData.completedAT), "dd.MM.yyyy")
                                color: "#a1a1a9"
                                font.pixelSize: 12
                            }
                        }
                    }

                    Button {
                        text: "Удалить"
                        flat: true
                        onClicked: Pulsar.emit("delete-todo", { ID: row.modelData.ID })
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

    Dialog {
        id: dateDialog

        parent: Overlay.overlay
        anchors.centerIn: parent
        modal: true
        title: "Дата создания"
        width: 340
        padding: 20

        property string todoID: ""

        function openFor(ID, createdAT) {
            todoID = ID
            dateInput.text = Qt.formatDate(new Date(createdAT), "dd.MM.yyyy")
            dateError.visible = false
            open()
        }

        function parseDate(text) {
            const parts = text.split(".")

            if (parts.length !== 3) return null

            const day = Number(parts[0])
            const month = Number(parts[1])
            const year = Number(parts[2])

            if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) return null
            if (year < 1970 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) return null

            const date = new Date(year, month - 1, day)

            if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null

            return date.getTime()
        }

        function save() {
            const value = parseDate(dateInput.text.trim())

            if (value === null) {
                dateError.visible = true
                return
            }

            Pulsar.emit("set-todo-date", { ID: todoID, createdAT: value })
            close()
        }

        contentItem: ColumnLayout {
            spacing: 8

            Label {
                text: "Укажите дату в формате ДД.ММ.ГГГГ"
                color: "#8e8e96"
                font.pixelSize: 13
            }

            TextField {
                id: dateInput

                Layout.fillWidth: true
                font.pixelSize: 15
                onAccepted: dateDialog.save()
            }

            Label {
                id: dateError

                visible: false
                text: "Неверная дата"
                color: "#ef4444"
                font.pixelSize: 12
            }
        }

        footer: Item {
            implicitHeight: 44

            RowLayout {
                anchors.fill: parent
                spacing: 8

                Item {
                    Layout.fillWidth: true
                }

                Button {
                    text: "Отмена"
                    onClicked: dateDialog.close()
                }

                Button {
                    text: "Сохранить"
                    onClicked: dateDialog.save()
                }
            }
        }

        onOpened: dateInput.forceActiveFocus()
    }

    Dialog {
        id: syncDialog

        parent: Overlay.overlay
        anchors.centerIn: parent
        modal: true
        title: "Синхронизация"
        width: 360
        padding: 20

        function openDialog() {
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
            spacing: 8

            Label {
                Layout.fillWidth: true
                text: "Адрес сервера (IP или домен). Пусто — синхронизация выключена."
                color: "#8e8e96"
                font.pixelSize: 13
                wrapMode: Text.WordWrap
            }

            TextField {
                id: hostInput

                Layout.fillWidth: true
                placeholderText: "например, 192.168.1.10"
                font.pixelSize: 15
            }

            Label {
                text: "Порт"
                color: "#8e8e96"
                font.pixelSize: 13
            }

            TextField {
                id: portInput

                Layout.fillWidth: true
                font.pixelSize: 15
                inputMethodHints: Qt.ImhDigitsOnly
                onAccepted: syncDialog.save()
            }

            Label {
                text: "Пароль (если задан на сервере)"
                color: "#8e8e96"
                font.pixelSize: 13
            }

            TextField {
                id: passwordInput

                Layout.fillWidth: true
                font.pixelSize: 15
                echoMode: TextInput.Password
                placeholderText: "необязательно"
            }

            Label {
                id: syncError

                visible: false
                color: "#ef4444"
                font.pixelSize: 12
            }
        }

        footer: Item {
            implicitHeight: 44

            RowLayout {
                anchors.fill: parent
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

        onOpened: hostInput.forceActiveFocus()
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

    function editDate(ID, createdAT) {
        dateDialog.openFor(ID, createdAT)
    }

    Component.onCompleted: input.forceActiveFocus()
}
