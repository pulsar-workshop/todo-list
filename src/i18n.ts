import { setLocale, setMessages, signal, storage, system, t } from "pulsar"

export type Language = "ru" | "en"

const STORAGE_KEY = "language"

export const language = signal<Language>("ru")

const EN: Record<string, string> = {
  "Задачи": "Tasks",
  "Задача": "Task",
  "Новая задача": "New task",
  "Синхронизировать": "Sync now",
  "Настройки…": "Settings…",
  "Настройки": "Settings",
  "Выход": "Quit",
  "Сегодня": "Today",
  "Завтра": "Tomorrow",
  "Вчера": "Yesterday",
  "с {from} до {to}": "{from} – {to}",
  "до {date}": "until {date}",
  "с {date}": "from {date}",
  "{size} КБ": "{size} KB",
  "Теги: {names}": "Tags: {names}",
  "Синхронизация": "Sync",
  "Сервер недоступен": "Server unavailable",
  "Синхронизировано": "Synced",
  "Ожидание": "Waiting",
  "Синхронизация выключена": "Sync is off",
  "Теги": "Tags",
  "Тегов пока нет — создайте первый ниже.": "No tags yet. Create the first one below.",
  "Новый тег": "New tag",
  "Добавить": "Add",
  "Свой цвет": "Custom color",
  "Готово": "Done",
  "Выберите дату": "Pick a date",
  "Предыдущий месяц": "Previous month",
  "Следующий месяц": "Next month",
  "Время": "Time",
  "ЧЧ": "HH",
  "ММ": "MM",
  "СС": "SS",
  "Папки": "Folders",
  "ОК": "OK",
  "Отмена": "Cancel",
  "Переименовать": "Rename",
  "Удалить папку": "Delete folder",
  "Папок пока нет.": "No folders yet.",
  "Новая папка": "New folder",
  "Создать": "Create",
  "Фильтр по тегам": "Filter by tags",
  "Тегов пока нет.": "No tags yet.",
  "Сбросить теги": "Clear tags",
  "Закрыть": "Close",
  "Просмотр": "Preview",
  "Дата: ДД.ММ.ГГГГ, время: ЧЧ:ММ:СС (время можно не указывать)": "Date: DD.MM.YYYY, time: HH:MM:SS (the time is optional)",
  "Название не может быть пустым": "The title cannot be empty",
  "Удалить задачу?": "Delete the task?",
  "Задачу нельзя будет восстановить.": "The task cannot be restored.",
  "Цвет тега": "Tag color",
  "Скопировано": "Copied",
  "Поделиться задачей": "Share the task",
  "Создано: {date}": "Created: {date}",
  "Завершено: {date}": "Completed: {date}",
  "Открыть": "Open",
  "Скачать": "Download",
  "Убрать": "Remove",
  "Назад": "Back",
  "Копировать": "Copy",
  "Удалить": "Delete",
  "Сохранить": "Save",
  "Не выбрано": "Not set",
  "ПОДЗАДАЧИ": "SUBTASKS",
  "Новая подзадача": "New subtask",
  "Название": "Title",
  "Описание": "Description",
  "ВРЕМЯ": "TIME",
  "Весь день": "All day",
  "С и до": "From and to",
  "Дата": "Date",
  "С": "From",
  "До (дедлайн)": "To (deadline)",
  "Создано": "Created",
  "Завершено": "Completed",
  "ПАПКА": "FOLDER",
  "Без папки": "No folder",
  "ТЕГИ": "TAGS",
  "Выбрать теги": "Choose tags",
  "ФАЙЛЫ": "FILES",
  "Прикрепить файл": "Attach a file",
  "На этот день задач нет": "No tasks on this day",
  "ТАЙМЛАЙН": "TIMELINE",
  "Задача на этот день": "Task for this day",
  "Осталось {count}": "{count} left",
  "Осталось {count} · {sync}": "{count} left · {sync}",
  "Сменить тему": "Switch theme",
  "Календарь": "Calendar",
  "Все": "All",
  "Поиск задач": "Search tasks",
  "Сбросить фильтры": "Clear filters",
  "Пока пусто": "Nothing here yet",
  "Добавьте первую задачу.": "Add the first task.",
  "Ничего не найдено": "Nothing found",
  "Измените запрос или сбросьте фильтры.": "Change the search or clear the filters.",
  "Что нужно сделать?": "What needs doing?",
  "Удалить папку?": "Delete the folder?",
  "Задачи из «{name}» останутся без папки.": "Tasks in “{name}” will stay without a folder.",
  "Удалить тег?": "Delete the tag?",
  "Тег «{name}» исчезнет у всех задач.": "The tag “{name}” will be removed from every task.",
  "Прикрепить файлы": "Attach files",
  "Скачано": "Downloaded",
  "Порт должен быть от 1 до 65535": "The port must be from 1 to 65535",
  "СТАТУС": "STATUS",
  "Активная": "Active",
  "Неактивная": "Inactive",
  "Неактивные · {count}": "Inactive · {count}",
  "ЯЗЫК": "LANGUAGE",
  "СЕРВЕР": "SERVER",
  "Адрес": "Address",
  "Порт": "Port",
  "Пароль (необязательно)": "Password (optional)",
  "Пустой адрес выключает синхронизацию.": "An empty address turns sync off.",
}

const NAMES = {
  ru: {
    weekdays: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
    weekdaysFull: ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"],
    months: ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"],
    monthsShort: ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"],
  },
  en: {
    weekdays: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
    weekdaysFull: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    monthsShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  },
} as const

const MONTHS_OF = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"]

/** Translates a Russian UI string; it reads the language, so screens redraw when it changes. */
export const tr = (text: string, params: Record<string, string | number> = {}): string => {
  return t(text, params, text)
}

export const weekdayNames = (): readonly string[] => NAMES[language.get()].weekdays

export const weekdayFullNames = (): readonly string[] => NAMES[language.get()].weekdaysFull

export const monthNames = (): readonly string[] => NAMES[language.get()].months

export const monthShortNames = (): readonly string[] => NAMES[language.get()].monthsShort

/** "5 января" in Russian, "January 5" in English. */
export const dayAndMonth = (date: Date): string => {
  if (language.get() === "en") return `${NAMES.en.months[date.getMonth()]} ${date.getDate()}`

  return `${date.getDate()} ${MONTHS_OF[date.getMonth()]}`
}

export const setLanguage = (next: Language): void => {
  language.set(next)
  setLocale(next)
  setMessages(next === "en" ? EN : {})
  void storage.set(STORAGE_KEY, next)
}

/** The saved language, or the system one: Russian for Russian systems, English otherwise. */
export const initLanguage = async (): Promise<void> => {
  const saved = await storage.get(STORAGE_KEY).catch(() => null)

  if (saved === "ru" || saved === "en") {
    setLanguage(saved)
    return
  }

  const locale = await system
    .locale()
    .then((info) => info.locale)
    .catch(() => "ru")

  setLanguage(locale.toLowerCase().startsWith("ru") ? "ru" : "en")
}
