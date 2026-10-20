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

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 24
        spacing: 12

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

            delegate: Rectangle {
                id: row

                required property var modelData

                width: list.width
                height: 48
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

                    Label {
                        Layout.fillWidth: true
                        text: row.modelData.text
                        color: row.modelData.done ? "#a1a1a9" : "#1d1d1f"
                        font.pixelSize: 15
                        font.strikeout: row.modelData.done
                        elide: Text.ElideRight
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

    function addTask() {
        if (input.text.trim().length === 0) return

        Pulsar.emit("add-todo", { text: input.text })
        input.text = ""
    }

    Component.onCompleted: input.forceActiveFocus()
}
