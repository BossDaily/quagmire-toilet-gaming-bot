import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const usersTable = sqliteTable("users_table", {
  id: int().primaryKey({ autoIncrement: true }),
  discordId: text().notNull(),
  guildId: text().notNull(),
  username: text().notNull(),
  optedOut: int({ mode: "boolean" }).notNull().default(false),
  optOutDate: int({ mode: "timestamp" }),
});
