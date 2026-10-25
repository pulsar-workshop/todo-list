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

    readonly property var tagPalette: ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#64748b"]

    signal saveRequested(string json)
    signal deleteRequested(string ID)
    signal addTagRequested(string name, string color)
    signal pickFilesRequested(string ID)
    signal removeFileRequested(string ID, string path)
    signal exportFileRequested(string path, string name)
    signal openFileRequested(string path)

    function openAttachment(file) {
        if (isImage(file.name)) {
            imageViewer.source = "file://" + file.path
            imageViewer.visible = true
            return
        }

        openFileRequested(file.path)
    }

    function closeViewer() {
        if (!imageViewer.visible) return false

        imageViewer.visible = false

        return true
    }

    function isImage(name) {
        return /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(name)
    }

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
        createdInput.text = formatTime(draft.createdAT)
        completedInput.text = formatTime(draft.completedAT)

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
        const createdAT = parseTime(createdInput.text)
        const completedAT = parseTime(completedInput.text)

        if (startAT === undefined || endAT === undefined || createdAT === undefined || completedAT === undefined) {
            timeError = true
            return
        }

        draft.text = titleInput.text.trim() || draft.text
        draft.description = descriptionInput.text
        draft.startAT = startAT
        draft.endAT = endAT
        draft.completedAT = completedAT

        if (createdAT !== null) draft.createdAT = createdAT

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
                        text: "Нажмите на поле, чтобы выбрать дату и время. Только конец — дедлайн."
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
                            readOnly: true
                            activeFocusOnPress: false

                            TapHandler {
                                onTapped: datePicker.openFor("start")
                            }
                        }

                        TextField {
                            id: endInput

                            Layout.fillWidth: true
                            placeholderText: "до"
                            font.pixelSize: 14
                            readOnly: true
                            activeFocusOnPress: false

                            TapHandler {
                                onTapped: datePicker.openFor("end")
                            }
                        }
                    }

                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 8

                        Label {
                            Layout.preferredWidth: 76
                            text: "Создано"
                            color: "#8e8e96"
                            font.pixelSize: 12
                        }

                        TextField {
                            id: createdInput

                            Layout.fillWidth: true
                            font.pixelSize: 14
                            readOnly: true
                            activeFocusOnPress: false

                            TapHandler {
                                onTapped: datePicker.openFor("created")
                            }
                        }
                    }

                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 8
                        visible: editor.draft && editor.draft.completedAT !== null

                        Label {
                            Layout.preferredWidth: 76
                            text: "Завершено"
                            color: "#8e8e96"
                            font.pixelSize: 12
                        }

                        TextField {
                            id: completedInput

                            Layout.fillWidth: true
                            font.pixelSize: 14
                            readOnly: true
                            activeFocusOnPress: false

                            TapHandler {
                                onTapped: datePicker.openFor("completed")
                            }
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
                            model: editor.tagPalette

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

                            Image {
                                visible: editor.isImage(modelData.name)
                                source: visible ? "file://" + modelData.path : ""
                                Layout.preferredWidth: 44
                                Layout.preferredHeight: 44
                                fillMode: Image.PreserveAspectCrop
                                asynchronous: true
                                cache: true

                                TapHandler {
                                    onTapped: editor.openAttachment(modelData)
                                }
                            }

                            ColumnLayout {
                                Layout.fillWidth: true
                                spacing: 2

                                Label {
                                    Layout.fillWidth: true
                                    text: modelData.name
                                    elide: Text.ElideMiddle
                                    font.pixelSize: 13

                                    TapHandler {
                                        onTapped: editor.openAttachment(modelData)
                                    }
                                }

                                Label {
                                    Layout.fillWidth: true
                                    visible: text !== ""
                                    text: editor.fileMeta(modelData)
                                    color: "#a1a1a9"
                                    font.pixelSize: 11
                                    elide: Text.ElideRight
                                }
                            }

                            Button {
                                text: "↓"
                                flat: true
                                onClicked: editor.exportFileRequested(modelData.path, modelData.name)
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

    Item {
        id: imageViewer

        anchors.fill: parent
        visible: false
        z: 300

        property string source: ""

        Rectangle {
            anchors.fill: parent
            color: "#000000"
        }

        Image {
            anchors.fill: parent
            anchors.margins: 8
            fillMode: Image.PreserveAspectFit
            source: imageViewer.source
            asynchronous: true
        }

        TapHandler {
            onTapped: imageViewer.visible = false
        }

        Button {
            text: "×"
            flat: true
            anchors.top: parent.top
            anchors.right: parent.right
            anchors.margins: 8
            onClicked: imageViewer.visible = false
        }
    }

    Dialog {
        id: datePicker

        parent: Overlay.overlay
        modal: true
        title: datePicker.target === "start" ? "Начало"
            : datePicker.target === "created" ? "Создано"
            : datePicker.target === "completed" ? "Завершено"
            : "Дедлайн"
        width: Math.min(editor.width - 32, 420)
        x: (Overlay.overlay.width - width) / 2
        y: Math.max(8, (Overlay.overlay.height - height) / 2)
        padding: 16

        property string target: "end"
        property int viewYear: 0
        property int viewMonth: 0
        property date selectedDate: new Date()
        property var dayModel: []

        readonly property int cellSize: Math.floor((width - 32) / 7)
        readonly property var monthNames: ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"]

        function buildDays() {
            const first = new Date(viewYear, viewMonth, 1)
            const offset = (first.getDay() + 6) % 7
            const total = new Date(viewYear, viewMonth + 1, 0).getDate()
            const cells = []

            for (let index = 0; index < 42; index++) {
                const day = index - offset + 1

                cells.push(day >= 1 && day <= total ? day : 0)
            }

            return cells
        }

        function refresh() {
            dayModel = buildDays()
        }

        function inputFor(which) {
            if (which === "start") return startInput
            if (which === "created") return createdInput
            if (which === "completed") return completedInput

            return endInput
        }

        function openFor(which) {
            target = which

            const value = parseTime(inputFor(which).text)
            const date = value ? new Date(value) : new Date()

            selectedDate = date
            viewYear = date.getFullYear()
            viewMonth = date.getMonth()
            hourBox.currentIndex = date.getHours()
            minuteBox.currentIndex = date.getMinutes()
            refresh()
            open()
        }

        function shiftMonth(delta) {
            const date = new Date(viewYear, viewMonth + delta, 1)

            viewYear = date.getFullYear()
            viewMonth = date.getMonth()
            refresh()
        }

        function shiftYear(delta) {
            viewYear += delta
            refresh()
        }

        function selectDay(day) {
            selectedDate = new Date(viewYear, viewMonth, day)
        }

        function isSelected(day) {
            return day > 0
                && selectedDate.getFullYear() === viewYear
                && selectedDate.getMonth() === viewMonth
                && selectedDate.getDate() === day
        }

        function accept() {
            const date = new Date(selectedDate)

            date.setHours(hourBox.currentIndex, minuteBox.currentIndex, 0, 0)

            const value = Qt.formatDateTime(date, "dd.MM.yyyy HH:mm")

            inputFor(target).text = value

            close()
        }

        function clear() {
            inputFor(target).text = ""

            close()
        }

        contentItem: ColumnLayout {
            width: datePicker.width - 32
            spacing: 8

            RowLayout {
                Layout.fillWidth: true
                spacing: 4

                Button {
                    text: "‹"
                    flat: true
                    onClicked: datePicker.shiftMonth(-1)
                }

                Label {
                    Layout.fillWidth: true
                    horizontalAlignment: Text.AlignHCenter
                    text: datePicker.monthNames[datePicker.viewMonth]
                    color: "#1d1d1f"
                    font.pixelSize: 16
                    font.bold: true
                }

                Button {
                    text: "›"
                    flat: true
                    onClicked: datePicker.shiftMonth(1)
                }
            }

            RowLayout {
                Layout.fillWidth: true
                spacing: 4

                Button {
                    text: "‹"
                    flat: true
                    onClicked: datePicker.shiftYear(-1)
                }

                Label {
                    Layout.fillWidth: true
                    horizontalAlignment: Text.AlignHCenter
                    text: datePicker.viewYear
                    color: "#1d1d1f"
                    font.pixelSize: 15
                }

                Button {
                    text: "›"
                    flat: true
                    onClicked: datePicker.shiftYear(1)
                }
            }

            Item {
                Layout.alignment: Qt.AlignHCenter
                width: datePicker.cellSize * 7
                implicitHeight: weekHeader.height + dayGrid.height + 4

                Grid {
                    id: weekHeader
                    columns: 7

                    Repeater {
                        model: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]

                        delegate: Label {
                            required property string modelData

                            width: datePicker.cellSize
                            horizontalAlignment: Text.AlignHCenter
                            text: modelData
                            color: "#8e8e96"
                            font.pixelSize: 12
                        }
                    }
                }

                Grid {
                    id: dayGrid
                    y: weekHeader.height + 4
                    columns: 7

                    Repeater {
                        model: datePicker.dayModel

                        delegate: Item {
                            id: cell

                            required property int modelData

                            width: datePicker.cellSize
                            height: datePicker.cellSize

                            Rectangle {
                                anchors.centerIn: parent
                                width: cell.width - 6
                                height: cell.height - 6
                                radius: width / 2
                                color: datePicker.isSelected(cell.modelData) ? "#3b82f6" : "transparent"

                                Text {
                                    anchors.centerIn: parent
                                    text: cell.modelData > 0 ? cell.modelData : ""
                                    color: datePicker.isSelected(cell.modelData) ? "#ffffff" : "#1d1d1f"
                                    font.pixelSize: 14
                                }
                            }

                            TapHandler {
                                onTapped: {
                                    if (cell.modelData > 0) datePicker.selectDay(cell.modelData)
                                }
                            }
                        }
                    }
                }
            }

            RowLayout {
                Layout.fillWidth: true
                spacing: 8

                Label {
                    text: "Время"
                    color: "#1d1d1f"
                    font.pixelSize: 14
                }

                Tumbler {
                    id: hourBox

                    Layout.preferredWidth: 64
                    Layout.preferredHeight: 108
                    model: 24
                    visibleItemCount: 3
                }

                Label {
                    text: ":"
                    color: "#1d1d1f"
                    font.pixelSize: 14
                }

                Tumbler {
                    id: minuteBox

                    Layout.preferredWidth: 64
                    Layout.preferredHeight: 108
                    model: 60
                    visibleItemCount: 3
                }

                Item {
                    Layout.fillWidth: true
                }
            }
        }

        footer: Item {
            implicitHeight: 56

            RowLayout {
                anchors.fill: parent
                anchors.margins: 4
                spacing: 8

                Button {
                    text: "Очистить"
                    flat: true
                    onClicked: datePicker.clear()
                }

                Item {
                    Layout.fillWidth: true
                }

                Button {
                    text: "Отмена"
                    onClicked: datePicker.close()
                }

                Button {
                    text: "Готово"
                    onClicked: datePicker.accept()
                }
            }
        }
    }
}
