import { int, sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// Users table for storing Discord user information
export const usersTable = sqliteTable("users", {
  id: int().primaryKey({ autoIncrement: true }),
  discordId: text("discord_id").notNull().unique(),
  username: text("username").notNull(),
  discriminator: text("discriminator"),
  avatar: text("avatar"),
  joinedAt: text("joined_at").default(sql`(datetime('now'))`),
  lastActive: text("last_active").default(sql`(datetime('now'))`),
});

// Guilds table for storing server information
export const guildsTable = sqliteTable("guilds", {
  id: int().primaryKey({ autoIncrement: true }),
  discordId: text("discord_id").notNull().unique(),
  name: text("name").notNull(),
  memberCount: integer("member_count").default(0),
  joinedAt: text("joined_at").default(sql`(datetime('now'))`),
  prefix: text("prefix").default("!"),
});

// Commands usage tracking
export const commandUsageTable = sqliteTable("command_usage", {
  id: int().primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  guildId: text("guild_id"),
  commandName: text("command_name").notNull(),
  executedAt: text("executed_at").default(sql`(datetime('now'))`),
  success: integer("success").default(1), // 1 for success, 0 for failure
});

// User settings/preferences
export const userSettingsTable = sqliteTable("user_settings", {
  id: int().primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().unique(),
  language: text("language").default("en"),
  timezone: text("timezone").default("UTC"),
  notificationsEnabled: integer("notifications_enabled").default(1),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

// Guild settings/configuration
export const guildSettingsTable = sqliteTable("guild_settings", {
  id: int().primaryKey({ autoIncrement: true }),
  guildId: text("guild_id").notNull().unique(),
  prefix: text("prefix").default("!"),
  welcomeChannelId: text("welcome_channel_id"),
  logChannelId: text("log_channel_id"),
  muteRoleId: text("mute_role_id"),
  autoModEnabled: integer("auto_mod_enabled").default(0),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

// Export types for TypeScript
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Guild = typeof guildsTable.$inferSelect;
export type NewGuild = typeof guildsTable.$inferInsert;

export type CommandUsage = typeof commandUsageTable.$inferSelect;
export type NewCommandUsage = typeof commandUsageTable.$inferInsert;

export type UserSettings = typeof userSettingsTable.$inferSelect;
export type NewUserSettings = typeof userSettingsTable.$inferInsert;

export type GuildSettings = typeof guildSettingsTable.$inferSelect;
export type NewGuildSettings = typeof guildSettingsTable.$inferInsert;
