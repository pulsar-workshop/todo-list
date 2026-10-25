import { App, storage } from "pulsar"

type Todo = {
  ID: string
  text: string
  done: boolean
  createdAT: number
  completedAT: number | null
}

const app = new App()

const newID = () => {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

let todos: Todo[] = []

const parseTodo = (value: unknown): Todo | null => {
  if (typeof value !== "object" || value === null) return null

  const record = value as Record<string, unknown>
  const rawID = record.ID ?? record.id

  if (typeof rawID !== "string") return null
  if (typeof record.text !== "string") return null
  if (typeof record.done !== "boolean") return null

  const rawCreatedAT = record.createdAT ?? record.createdAt
  const createdAT = typeof rawCreatedAT === "number" ? rawCreatedAT : Date.now()
  const completedAT = typeof record.completedAT === "number" ? record.completedAT : null

  return {
    ID: rawID,
    text: record.text,
    done: record.done,
    createdAT,
    completedAT,
  }
}

const save = () => {
  void storage.set("todos", todos)
}

const render = () => {
  app.store.set("todos", todos)
  app.store.set("activeCount", todos.filter((todo) => !todo.done).length)
}

const addTodo = (params: { text?: unknown }) => {
  const text = typeof params?.text === "string" ? params.text.trim() : ""

  if (!text) return

  todos = [
    ...todos,
    {
      ID: newID(),
      text,
      done: false,
      createdAT: Date.now(),
      completedAT: null,
    },
  ]

  render()
  save()
}

const toggleTodo = (params: { ID?: unknown }) => {
  const ID = typeof params?.ID === "string" ? params.ID : ""

  if (!ID) return

  const target = todos.find((todo) => todo.ID === ID)

  if (!target) return

  const done = !target.done

  todos = todos.map((todo) => {
    if (todo.ID !== ID) return todo

    return {
      ...todo,
      done,
      completedAT: done ? Date.now() : null,
    }
  })

  render()
  save()
}

const deleteTodo = (params: { ID?: unknown }) => {
  const ID = typeof params?.ID === "string" ? params.ID : ""

  if (!ID) return

  todos = todos.filter((todo) => todo.ID !== ID)

  render()
  save()
}

const setTodoDate = (params: { ID?: unknown; createdAT?: unknown }) => {
  const ID = typeof params?.ID === "string" ? params.ID : ""
  const rawCreatedAT = params?.createdAT
  const createdAT = typeof rawCreatedAT === "number" && Number.isFinite(rawCreatedAT) ? rawCreatedAT : null

  if (!ID || createdAT === null) return

  const exists = todos.some((todo) => todo.ID === ID)

  if (!exists) return

  todos = todos.map((todo) => (todo.ID === ID ? { ...todo, createdAT } : todo))

  render()
  save()
}

const restore = async () => {
  const saved = await storage.get("todos")
  const list = Array.isArray(saved) ? saved : []

  todos = list.map(parseTodo).filter((todo): todo is Todo => todo !== null)

  render()
  save()
}

app.on("add-todo", addTodo)
app.on("toggle-todo", toggleTodo)
app.on("delete-todo", deleteTodo)
app.on("set-todo-date", setTodoDate)

await restore()

app.run()
