import Dexie, { type EntityTable } from "dexie";

export type MessageRecord = {
  id?: number;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};

const db = new Dexie("mini-maverick") as Dexie & {
  messages: EntityTable<MessageRecord, "id">;
};

db.version(1).stores({
  messages: "++id, createdAt",
});

export default db;
