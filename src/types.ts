export type Subtask = {
  ID: string
  text: string
  done: boolean
  createdAT: number
  completedAT: number | null
}

export type Attachment = {
  name: string
  path: string
  key?: string
  thumb?: string
  size?: number
  modifiedAT?: number
}

export type Todo = {
  ID: string
  text: string
  description: string
  done: boolean
  /** Inactive tasks stay out of the main list until the user opens them. */
  active: boolean
  createdAT: number
  updatedAT: number
  completedAT: number | null
  startAT: number | null
  endAT: number | null
  createdAllDay: boolean
  completedAllDay: boolean
  startAllDay: boolean
  endAllDay: boolean
  tags: string[]
  folderID: string | null
  subtasks: Subtask[]
  files: Attachment[]
}

export type Tag = {
  ID: string
  name: string
  color: string
  updatedAT: number
}

export type Folder = {
  ID: string
  name: string
  updatedAT: number
}

export type SyncSettings = {
  host: string
  port: string
  password: string
}

export type RemoteState = {
  binaryFiles: boolean
  todos: Todo[]
  tags: Tag[]
  folders: Folder[]
  deletedTodos: string[]
  deletedTags: string[]
  deletedFolders: string[]
  files: string[]
}
