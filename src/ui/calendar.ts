import {
  Box,
  Button,
  Column,
  Grid,
  IconButton,
  Input,
  Row,
  Sheet,
  Text,
  component,
  type UiNode,
} from "pulsar"
import { ui } from "../state.ts"
import { textColor } from "../theme.ts"
import {
  closeCalendar,
  pickCalendarDay,
  pickCalendarToday,
  shiftCalendar,
  shiftCalendarYear,
} from "./state.ts"

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]

const MONTHS = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
]

const timeInput = (
  key: "calendarHour" | "calendarMinute" | "calendarSecond",
  placeholder: string,
) =>
  Input({
    value: ui[key],
    placeholder,
    variant: "outline",
    textColor: textColor(false),
    keyboardType: "number",
    maxLength: 2,
    width: 56,
    onInput: (value) => {
      ui[key] = value.replace(/\D/g, "").slice(0, 2)
    },
  })

const selectedParts = (
  value: string,
): { day: number; month: number; year: number } | null => {
  const match = /^(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(value.trim())

  if (!match) return null

  return {
    day: Number(match[1]),
    month: Number(match[2]),
    year: Number(match[3]),
  }
}

export const CalendarSheet = component(() => {
  const year = ui.calendarYear
  const month = ui.calendarMonth
  const target = ui.calendarTarget
  const value = target ? ui[target] : ""
  const selected = selectedParts(value)
  const withTime = ui.calendarWithTime

  const lead = (new Date(year, month, 1).getDay() + 6) % 7
  const total = new Date(year, month + 1, 0).getDate()
  const cells: UiNode[] = []

  for (let i = 0; i < lead; i++) cells.push(Box({ height: 36 }))

  for (let day = 1; day <= total; day++) {
    const isSelected =
      selected?.year === year &&
      selected.month === month + 1 &&
      selected.day === day

    cells.push(
      Button(
        {
          variant: isSelected ? "solid" : "ghost",
          size: "sm",
          height: 36,
          radius: 8,
          onClick: () => pickCalendarDay(day),
        },
        String(day),
      ),
    )
  }

  return Sheet(
    {
      open: true,
      title: "Выберите дату",
      onClose: closeCalendar,
    },
    Row(
      { gap: 4, fillWidth: true, align: "center" },
      Button(
        {
          variant: "ghost",
          size: "sm",
          width: 32,
          onClick: () => shiftCalendarYear(-1),
        },
        "«",
      ),
      IconButton({
        icon: "chevron_left",
        tooltip: "Предыдущий месяц",
        onClick: () => shiftCalendar(-1),
      }),
      Text({
        text: `${MONTHS[month]} ${year}`,
        size: 16,
        weight: "semibold",
        color: textColor(false),
        expand: true,
        align: "center",
      }),
      IconButton({
        icon: "chevron_right",
        tooltip: "Следующий месяц",
        onClick: () => shiftCalendar(1),
      }),
      Button(
        {
          variant: "ghost",
          size: "sm",
          width: 32,
          onClick: () => shiftCalendarYear(1),
        },
        "»",
      ),
    ),
    Grid(
      { columns: 7, gap: 2, fillWidth: true, fillHeight: false, height: 18 },
      ...WEEKDAYS.map((label) =>
        Text({ text: label, size: 11, color: textColor(true), align: "center" }),
      ),
    ),
    Grid(
      {
        columns: 7,
        gap: 2,
        fillWidth: true,
        fillHeight: false,
        height: Math.ceil((lead + total) / 7) * 38 - 2,
      },
      ...cells,
    ),
    Box({ height: 10 }),
    withTime
      ? Column(
          { gap: 6, fillWidth: true },
          Text({ text: "Время", size: 11, color: textColor(true) }),
          Row(
            { gap: 6, fillWidth: true, align: "center" },
            timeInput("calendarHour", "ЧЧ"),
            Text({ text: ":", size: 16, color: textColor(false) }),
            timeInput("calendarMinute", "ММ"),
            Text({ text: ":", size: 16, color: textColor(false) }),
            timeInput("calendarSecond", "СС"),
          ),
        )
      : null,
    Button({ variant: "ghost", onClick: pickCalendarToday }, "Сегодня"),
  )
})
