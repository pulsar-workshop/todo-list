import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import Pulsar 1.0

Item {
    id: editor

    anchors.fill: parent
    visible: false
    z: 100

    property var draft: null
    property var allTags: []
    property int tick: 0
    property bool timeError: false
    property string newTagColor: "#3b82f6"

    readonly property var palette: ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#64748b"]

    signal saveRequested(string json)
    signal deleteRequested(string ID)
    signal addTagRequested(string name, string color)
    signal pickFilesRequested(string ID)
    signal removeFileRequested(string ID, string path)
    function fileMeta(file) {
        const parts = []

        if (file.size) parts.push(Math.max(1, Math.round(file.size / 1024)) + " КБ")
        if (file.modifiedAT) parts.push(Qt.formatDateTime(new Date(file.modifiedAT), "dd.MM.yyyy"))

        return parts.join(" · ")
    }

    function formatTime(value) {
        if (value === null || value === undefined) return ""

        return Qt.formatDateTime(new Date(value), "dd.MM.yyyy HH:mm")
    }

    function parseTime(text) {
        const value = text.trim()

        if (value === "") return null

        const match = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/)

        if (!match) return undefined

        const day = Number(match[1])
        const month = Number(match[2])
        const year = Number(match[3])
        const hour = match[4] === undefined ? 0 : Number(match[4])
        const minute = match[5] === undefined ? 0 : Number(match[5])

        if (month < 1 || month > 12 || day < 1 || day > 31) return undefined
        if (hour > 23 || minute > 59) return undefined

        const date = new Date(year, month - 1, day, hour, minute)

        if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return undefined

        return date.getTime()
    }

    function newID() {
        return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10)
    }

    function openFor(task, tags) {
        draft = JSON.parse(JSON.stringify(task))
        allTags = JSON.parse(JSON.stringify(tags ?? []))
        tick++
        timeError = false

        titleInput.text = draft.text
        descriptionInput.text = draft.description
        startInput.text = formatTime(draft.startAT)
        endInput.text = formatTime(draft.endAT)

        visible = true
        titleInput.forceActiveFocus()
    }

    function close() {
        visible = false
    }

    function attachTag(tag) {
        if (!draft || !tag) return

        if (!allTags.some((item) => item.ID === tag.ID)) allTags = [...allTags, tag]
        if (!draft.tags.includes(tag.ID)) draft.tags = [...draft.tags, tag.ID]

        tick++
    }

    function attachFiles(files) {
        if (!draft) return

        draft.files = [...draft.files, ...files]
        tick++
    }

    function toggleTag(ID) {
        draft.tags = draft.tags.includes(ID) ? draft.tags.filter((item) => item !== ID) : [...draft.tags, ID]
        tick++
    }

    function addSubtask() {
        const text = subtaskInput.text.trim()

        if (!text) return

        draft.subtasks = [
            ...draft.subtasks,
            { ID: newID(), text, done: false, createdAT: Date.now(), completedAT: null },
        ]

        subtaskInput.text = ""
        tick++
    }

    function save() {
        const startAT = parseTime(startInput.text)
        const endAT = parseTime(endInput.text)

        if (startAT === undefined || endAT === undefined) {
            timeError = true
            return
        }

        draft.text = titleInput.text.trim() || draft.text
        draft.description = descriptionInput.text
        draft.startAT = startAT
        draft.endAT = endAT

        saveRequested(JSON.stringify(draft))
        close()
    }

    Rectangle {
        anchors.fill: parent
        color: "#80000000"

        TapHandler {
            onTapped: editor.close()
        }
    }

    Rectangle {
        id: panel

        width: Math.min(editor.width - 24, 520)
        height: Math.min(editor.height - 40, 680)
        anchors.centerIn: parent
        radius: 16
        color: "#ffffff"

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 16
            spacing: 8

            Label {
                text: "Задача"
                color: "#1d1d1f"
                font.pixelSize: 22
                font.bold: true
            }

            ScrollView {
                id: contentScroll

                Layout.fillWidth: true
                Layout.fillHeight: true
                clip: true

                ColumnLayout {
                    width: contentScroll.availableWidth
                    spacing: 8

                    TextField {
                        id: titleInput

                        Layout.fillWidth: true
                        placeholderText: "Название"
                        font.pixelSize: 16
                    }

                    TextArea {
                        id: descriptionInput

                        Layout.fillWidth: true
                        placeholderText: "Описание"
                        wrapMode: TextArea.Wrap
                        font.pixelSize: 14
                        implicitHeight: 72
                    }

                    Label {
                        Layout.fillWidth: true
                        text: "Начало и конец (ДД.ММ.ГГГГ ЧЧ:ММ). Только конец — дедлайн."
                        color: "#8e8e96"
                        font.pixelSize: 12
                        wrapMode: Text.WordWrap
                    }

                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 8

                        TextField {
                            id: startInput

                            Layout.fillWidth: true
                            placeholderText: "с"
                            font.pixelSize: 14
                        }

                        TextField {
                            id: endInput

                            Layout.fillWidth: true
                            placeholderText: "до"
                            font.pixelSize: 14
                        }
                    }

                    Label {
                        visible: editor.timeError
                        text: "Дата и время в формате ДД.ММ.ГГГГ ЧЧ:ММ"
                        color: "#ef4444"
                        font.pixelSize: 12
                    }

                    Label {
                        text: "Теги"
                        color: "#1d1d1f"
                        font.pixelSize: 14
                        font.bold: true
                    }

                    Flow {
                        Layout.fillWidth: true
                        spacing: 6

                        Repeater {
                            model: editor.allTags

                            delegate: TagChip {
                                required property var modelData

                                label: modelData.name
                                chipColor: modelData.color
                                selected: {
                                    editor.tick
                                    return editor.draft ? editor.draft.tags.includes(modelData.ID) : false
                                }
                                interactive: true
                                onClicked: editor.toggleTag(modelData.ID)
                            }
                        }
                    }

                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 6

                        TextField {
                            id: tagInput

                            Layout.fillWidth: true
                            placeholderText: "Новый тег"
                            font.pixelSize: 14
                        }

                        Button {
                            text: "Добавить"
                            onClicked: {
                                const name = tagInput.text.trim()

                                if (!name) return

                                editor.addTagRequested(name, editor.newTagColor)
                                tagInput.text = ""
                            }
                        }
                    }

                    RowLayout {
                        spacing: 6

                        Repeater {
                            model: editor.palette

                            delegate: Rectangle {
                                required property string modelData

                                width: 20
                                height: 20
                                radius: 10
                                color: modelData
                                border.width: editor.newTagColor === modelData ? 2 : 0
                                border.color: "#1d1d1f"

                                TapHandler {
                                    onTapped: editor.newTagColor = modelData
                                }
                            }
                        }
                    }

                    Label {
                        text: "Подзадачи"
                        color: "#1d1d1f"
                        font.pixelSize: 14
                        font.bold: true
                    }

                    Repeater {
                        model: {
                            editor.tick
                            return editor.draft ? editor.draft.subtasks : []
                        }

                        delegate: RowLayout {
                            required property var modelData
                            required property int index

                            Layout.fillWidth: true
                            spacing: 6

                            CheckBox {
                                checked: modelData.done
                                onToggled: {
                                    const subtask = editor.draft.subtasks[index]

                                    subtask.done = checked
                                    subtask.completedAT = checked ? Date.now() : null
                                }
                            }

                            TextField {
                                Layout.fillWidth: true
                                text: modelData.text
                                font.pixelSize: 13
                                onTextEdited: editor.draft.subtasks[index].text = text
                            }

                            Button {
                                text: "×"
                                flat: true
                                onClicked: {
                                    editor.draft.subtasks.splice(index, 1)
                                    editor.tick++
                                }
                            }
                        }
                    }

                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 6

                        TextField {
                            id: subtaskInput

                            Layout.fillWidth: true
                            placeholderText: "Новая подзадача"
                            font.pixelSize: 14
                            onAccepted: editor.addSubtask()
                        }

                        Button {
                            text: "Добавить"
                            onClicked: editor.addSubtask()
                        }
                    }

                    Label {
                        text: "Файлы"
                        color: "#1d1d1f"
                        font.pixelSize: 14
                        font.bold: true
                    }

                    Repeater {
                        model: {
                            editor.tick
                            return editor.draft ? editor.draft.files : []
                        }

                        delegate: RowLayout {
                            required property var modelData
                            required property int index

                            Layout.fillWidth: true
                            spacing: 6

                            Label {
                                Layout.fillWidth: true
                                text: modelData.name
                                elide: Text.ElideMiddle
                                font.pixelSize: 13
                            }

                            Button {
                                text: "×"
                                flat: true
                                onClicked: {
                                    const file = editor.draft.files[index]

                                    editor.removeFileRequested(editor.draft.ID, file.path)
                                    editor.draft.files.splice(index, 1)
                                    editor.tick++
                                }
                            }
                        }
                    }

                    Button {
                        text: "Прикрепить файл"
                        onClicked: editor.pickFilesRequested(editor.draft.ID)
                    }
                }
            }

            RowLayout {
                Layout.fillWidth: true
                spacing: 8

                Button {
                    text: "Удалить"
                    flat: true
                    onClicked: {
                        editor.deleteRequested(editor.draft.ID)
                        editor.close()
                    }
                }

                Item {
                    Layout.fillWidth: true
                }

                Button {
                    text: "Отмена"
                    onClicked: editor.close()
                }

                Button {
                    text: "Сохранить"
                    onClicked: editor.save()
                }
            }
        }
    }
}
