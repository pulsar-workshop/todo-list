export type Subtask = {
  ID: string;
  text: string;
  done: boolean;
  createdAT: number;
  completedAT: number | null;
};

export type Attachment = {
  name: string;
  path: string;
  key?: string;
  thumb?: string;
  size?: number;
  modifiedAT?: number;
};

export type Todo = {
  ID: string;
  text: string;
  description: string;
  done: boolean;
  createdAT: number;
  updatedAT: number;
  completedAT: number | null;
  startAT: number | null;
  endAT: number | null;
  createdAllDay: boolean;
  completedAllDay: boolean;
  startAllDay: boolean;
  endAllDay: boolean;
  tags: string[];
  subtasks: Subtask[];
  files: Attachment[];
};

export type Tag = {
  ID: string;
  name: string;
  color: string;
  updatedAT: number;
};

export type SyncSettings = {
  host: string;
  port: string;
  password: string;
};

export type RemoteState = {
  todos: Todo[];
  tags: Tag[];
  deletedTodos: string[];
  deletedTags: string[];
  files: string[];
};
