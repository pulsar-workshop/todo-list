import { App, storage } from "pulsar"

type Todo = {
  ID: string
  text: string
  done: boolean
}

const app = new App()

let todos: Todo[] = []

const isTodo = (value: unknown): value is Todo => {
  if (typeof value !== "object" || value === null) return false

  const record = value as Record<string, unknown>

  return typeof record.ID === "string" && typeof record.text === "string" && typeof record.done === "boolean"
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

  todos = [...todos, { ID: crypto.randomUUID(), text, done: false }]

  render()
  save()
}

const toggleTodo = (params: { ID?: unknown }) => {
  const ID = typeof params?.ID === "string" ? params.ID : ""

  if (!ID) return

  todos = todos.map((todo) => (todo.ID === ID ? { ...todo, done: !todo.done } : todo))

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

const restore = async () => {
  const saved = await storage.get("todos")
  const list = Array.isArray(saved) ? saved : []

  todos = list.filter(isTodo)

  render()
}

app.on("add-todo", addTodo)
app.on("toggle-todo", toggleTodo)
app.on("delete-todo", deleteTodo)

await restore()

app.run()
