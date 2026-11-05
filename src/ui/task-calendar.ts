import {
  Box,
  Column,
  Page,
  Row,
  Text,
  component,
  computed,
  type ColorValue,
  type UiNode,
} from "pulsar"
import { addTodo } from "../actions.ts"
import { dueTone } from "../format.ts"
import { sortedTodos, ui } from "../state.ts"
import {
  accentFrom,
  accentTo,
  backgroundColor,
  dangerColor,
  onAccentColor,
  textColor,
} from "../theme.ts"
import type { Todo } from "../types.ts"
import { Composer } from "./composer.ts"
import { accentGradient, iconTile, pill, sectionTitle } from "./kit.ts"
import {
  closeTaskCalendar,
  selectTaskDay,
  shiftTaskMonth,
} from "./state.ts"
import { TaskRow } from "./task-row.ts"

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
const WEEKDAYS_FULL = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"]
const MONTHS = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"]
const MONTHS_OF = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"]
const MAX_RANGE_DAYS = 62

const dayKey = (year: number, month: number, day: number): string => {
  return `${year}-${month}-${day}`
}

const todoDays = (todo: Todo): string[] => {
  const first = todo.startAT ?? todo.endAT
  const last = todo.endAT ?? todo.startAT

  if (first === null || last === null) return []

  const days: string[] = []
  const start = new Date(first)
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate())

  while (cursor.getTime() <= last && days.length < MAX_RANGE_DAYS) {
    days.push(dayKey(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()))
    cursor.setDate(cursor.getDate() + 1)
  }

  return days
}

const todosByDay = computed(() => {
  const byDay = new Map<string, Todo[]>()

  for (const todo of sortedTodos.get()) {
    for (const key of todoDays(todo)) byDay.set(key, [...(byDay.get(key) ?? []), todo])
  }

  return byDay
})

const dotColor = (todo: Todo, selected: boolean): ColorValue => {
  if (selected) return onAccentColor()
  if (todo.done) return textColor(true)
  if (dueTone(todo) === "overdue") return dangerColor()

  return accentTo()
}

const dayCell = (year: number, month: number, day: number): UiNode => {
  const now = new Date()
  const today =
    now.getFullYear() === year && now.getMonth() === month && now.getDate() === day
  const selected = ui.taskCalendarDay === day
  const todos = todosByDay.get().get(dayKey(year, month, day)) ?? []

  return Column(
    {
      key: `day-${day}`,
      flex: 1,
      height: 50,
      radius: 14,
      gap: 3,
      justify: "center",
      alignItems: "center",
      gradient: selected ? accentGradient() : undefined,
      borderWidth: today && !selected ? 1 : 0,
      borderColor: accentFrom(),
      pressed: { scale: 0.92 },
      transition: { duration: 90 },
      onClick: () => selectTaskDay(new Date(year, month, day)),
    },
    Text({
      text: String(day),
      size: 15,
      weight: selected || today ? "semibold" : "normal",
      color: selected ? onAccentColor() : today ? accentFrom() : textColor(false),
    }),
    Row(
      { gap: 3, height: 5, alignItems: "center" },
      ...todos
        .slice(0, 3)
        .map((todo) =>
          Box({ key: todo.ID, width: 5, height: 5, radius: 3, color: dotColor(todo, selected) }),
        ),
    ),
  )
}

const MonthGrid = component(() => {
  const year = ui.taskCalendarYear
  const month = ui.taskCalendarMonth
  const lead = (new Date(year, month, 1).getDay() + 6) % 7
  const total = new Date(year, month + 1, 0).getDate()
  const cells: UiNode[] = []

  for (let i = 0; i < lead; i++) cells.push(Box({ key: `lead-${i}`, flex: 1, height: 50 }))
  for (let day = 1; day <= total; day++) cells.push(dayCell(year, month, day))
  for (let i = 0; cells.length % 7 !== 0; i++) cells.push(Box({ key: `tail-${i}`, flex: 1, height: 50 }))

  const weeks: UiNode[] = []

  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(Row({ key: `week-${i / 7}`, gap: 2, fillWidth: true }, ...cells.slice(i, i + 7)))
  }

  return Column(
    {
      key: "month",
      gap: 2,
      fillWidth: true,
      drag: {
        axis: "x",
        onRelease: ({ direction }) => shiftTaskMonth(direction === "left" ? 1 : -1),
      },
    },
    Row(
      { gap: 2, fillWidth: true },
      ...WEEKDAYS.map((label) =>
        Text({
          key: label,
          text: label,
          size: 12,
          color: textColor(true),
          align: "center",
          flex: 1,
        }),
      ),
    ),
    ...weeks,
  )
})

const DayTasks = component(() => {
  const date = new Date(ui.taskCalendarYear, ui.taskCalendarMonth, ui.taskCalendarDay)
  const todos =
    todosByDay.get().get(dayKey(date.getFullYear(), date.getMonth(), date.getDate())) ?? []

  return Column(
    { gap: 8, fillWidth: true },
    sectionTitle(
      `${WEEKDAYS_FULL[date.getDay()]}, ${date.getDate()} ${MONTHS_OF[date.getMonth()]}`.toUpperCase(),
    ),
    todos.length === 0
      ? Text({ text: "На этот день задач нет", size: 14, color: textColor(true) })
      : null,
    ...todos.map((todo) => TaskRow({ key: todo.ID, todo })),
  )
})

const Header = component(() => {
  const now = new Date()
  const onToday =
    ui.taskCalendarYear === now.getFullYear() &&
    ui.taskCalendarMonth === now.getMonth() &&
    ui.taskCalendarDay === now.getDate()

  return Row(
    { gap: 8, fillWidth: true, alignItems: "center" },
    iconTile({ icon: "arrow_back", tooltip: "Назад", onClick: closeTaskCalendar }),
    Text({
      text: `${MONTHS[ui.taskCalendarMonth]} ${ui.taskCalendarYear}`,
      size: 20,
      weight: "semibold",
      color: textColor(false),
      flex: 1,
      maxLines: 1,
      elide: "right",
    }),
    onToday
      ? null
      : pill({
          key: "today",
          label: "Сегодня",
          selected: false,
          onClick: () => selectTaskDay(new Date()),
        }),
    iconTile({ icon: "chevron_left", tooltip: "Предыдущий месяц", onClick: () => shiftTaskMonth(-1) }),
    iconTile({ icon: "chevron_right", tooltip: "Следующий месяц", onClick: () => shiftTaskMonth(1) }),
  )
})

export const TaskCalendarPage = component(() => {
  return Box(
    { key: "task-calendar", fill: true, color: backgroundColor() },
    Page(
      {
        padding: 16,
        gap: 16,
        header: Header({}),
        footer: Composer({
          placeholder: "Задача на этот день",
          onSubmit: (text) => {
            const dueAT = new Date(
              ui.taskCalendarYear,
              ui.taskCalendarMonth,
              ui.taskCalendarDay,
            ).getTime()

            addTodo({ text, dueAT })
          },
        }),
      },
      MonthGrid({}),
      DayTasks({}),
    ),
  )
})
