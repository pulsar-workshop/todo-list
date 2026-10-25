import QtQuick

Rectangle {
    id: chip

    property string label: ""
    property color chipColor: "#64748b"
    property bool selected: true
    property bool interactive: false
    property int maxWidth: 0

    signal clicked()

    implicitWidth: chip.maxWidth > 0 ? Math.min(text.implicitWidth + 16, chip.maxWidth) : text.implicitWidth + 16
    implicitHeight: 24
    radius: 12
    color: chip.selected ? chip.chipColor : "#e5e7eb"
    opacity: chip.selected ? 1 : 0.6

    Text {
        id: text

        anchors.centerIn: parent
        width: Math.min(implicitWidth, chip.width - 16)
        text: chip.label
        color: chip.selected ? "#ffffff" : "#4b5563"
        font.pixelSize: 12
        elide: Text.ElideRight
    }

    TapHandler {
        enabled: chip.interactive
        onTapped: chip.clicked()
    }
}
