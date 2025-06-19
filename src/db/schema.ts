import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const usersTable = sqliteTable("users_table", {
  id: int().primaryKey({ autoIncrement: true }),
  discordId: text().notNull(),
  guildId: text().notNull(),
  username: text().notNull(),
  optedOut: int({ mode: "boolean" }).notNull().default(false),
  optOutDate: int({ mode: "timestamp" }),
});

export const linkReplaceOptOutTable = sqliteTable("link_replace_opt_out", {
  id: int().primaryKey({ autoIncrement: true }),
  discordId: text().notNull(),
  guildId: text().notNull(),
  optedOut: int({ mode: "boolean" }).notNull().default(false),
  optOutDate: int({ mode: "timestamp" }),
});

export const messageForwardingTable = sqliteTable("message_forwarding", {
  id: int().primaryKey({ autoIncrement: true }),
  guildId: text().notNull().unique(),
  categoryId: text().notNull(),
  targetChannelId: text().notNull(),
  createdAt: int({ mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: int({ mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
