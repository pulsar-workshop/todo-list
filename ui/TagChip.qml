import QtQuick

Rectangle {
    id: chip

    property string label: ""
    property color chipColor: "#64748b"
    property bool selected: true
    property bool interactive: false

    signal clicked()

    implicitWidth: text.implicitWidth + 16
    implicitHeight: 24
    radius: 12
    color: chip.selected ? chip.chipColor : "#e5e7eb"
    opacity: chip.selected ? 1 : 0.6

    Text {
        id: text

        anchors.centerIn: parent
        text: chip.label
        color: chip.selected ? "#ffffff" : "#4b5563"
        font.pixelSize: 12
    }

    TapHandler {
        enabled: chip.interactive
        onTapped: chip.clicked()
    }
}
