import { blob, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const todos = sqliteTable("todos", {
  ID: text("ID").primaryKey(),
  data: text("data").notNull(),
  updatedAT: integer("updatedAT").notNull(),
  deleted: integer("deleted").notNull().default(0),
})

export const tags = sqliteTable("tags", {
  ID: text("ID").primaryKey(),
  data: text("data").notNull(),
  updatedAT: integer("updatedAT").notNull(),
  deleted: integer("deleted").notNull().default(0),
})

export const folders = sqliteTable("folders", {
  ID: text("ID").primaryKey(),
  data: text("data").notNull(),
  updatedAT: integer("updatedAT").notNull(),
  deleted: integer("deleted").notNull().default(0),
})

export const files = sqliteTable("files", {
  key: text("key").primaryKey(),
  data: blob("data", { mode: "buffer" }).notNull(),
  updatedAT: integer("updatedAT").notNull(),
})
