import { eq, and, desc } from 'drizzle-orm';
import { db, usersTable, guildsTable, commandUsageTable, userSettingsTable, guildSettingsTable } from '../db';
import type { NewUser, NewGuild, NewCommandUsage, NewUserSettings, NewGuildSettings } from '../db';

export class DatabaseService {
  // User operations
  static async createUser(userData: NewUser) {
    try {
      const [user] = await db.insert(usersTable).values(userData).returning();
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  static async getUserByDiscordId(discordId: string) {
    try {
      const user = await db.select().from(usersTable).where(eq(usersTable.discordId, discordId)).limit(1);
      return user[0] || null;
    } catch (error) {
      console.error('Error getting user by Discord ID:', error);
      throw error;
    }
  }

  static async updateUserActivity(discordId: string) {
    try {
      await db.update(usersTable)
        .set({ lastActive: new Date().toISOString() })
        .where(eq(usersTable.discordId, discordId));
    } catch (error) {
      console.error('Error updating user activity:', error);
      throw error;
    }
  }

  // Guild operations
  static async createGuild(guildData: NewGuild) {
    try {
      const [guild] = await db.insert(guildsTable).values(guildData).returning();
      return guild;
    } catch (error) {
      console.error('Error creating guild:', error);
      throw error;
    }
  }

  static async getGuildByDiscordId(discordId: string) {
    try {
      const guild = await db.select().from(guildsTable).where(eq(guildsTable.discordId, discordId)).limit(1);
      return guild[0] || null;
    } catch (error) {
      console.error('Error getting guild by Discord ID:', error);
      throw error;
    }
  }

  static async updateGuildMemberCount(discordId: string, memberCount: number) {
    try {
      await db.update(guildsTable)
        .set({ memberCount })
        .where(eq(guildsTable.discordId, discordId));
    } catch (error) {
      console.error('Error updating guild member count:', error);
      throw error;
    }
  }

  // Command usage tracking
  static async logCommandUsage(commandData: NewCommandUsage) {
    try {
      const [usage] = await db.insert(commandUsageTable).values(commandData).returning();
      return usage;
    } catch (error) {
      console.error('Error logging command usage:', error);
      throw error;
    }
  }

  static async getCommandStats(commandName?: string, userId?: string, guildId?: string) {
    try {
      let query = db.select().from(commandUsageTable);
      
      const conditions = [];
      if (commandName) conditions.push(eq(commandUsageTable.commandName, commandName));
      if (userId) conditions.push(eq(commandUsageTable.userId, userId));
      if (guildId) conditions.push(eq(commandUsageTable.guildId, guildId));
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      const stats = await query.orderBy(desc(commandUsageTable.executedAt)).limit(100);
      return stats;
    } catch (error) {
      console.error('Error getting command stats:', error);
      throw error;
    }
  }

  // User settings
  static async createUserSettings(settingsData: NewUserSettings) {
    try {
      const [settings] = await db.insert(userSettingsTable).values(settingsData).returning();
      return settings;
    } catch (error) {
      console.error('Error creating user settings:', error);
      throw error;
    }
  }

  static async getUserSettings(userId: string) {
    try {
      const settings = await db.select().from(userSettingsTable).where(eq(userSettingsTable.userId, userId)).limit(1);
      return settings[0] || null;
    } catch (error) {
      console.error('Error getting user settings:', error);
      throw error;
    }
  }

  static async updateUserSettings(userId: string, updates: Partial<NewUserSettings>) {
    try {
      await db.update(userSettingsTable)
        .set({ ...updates, updatedAt: new Date().toISOString() })
        .where(eq(userSettingsTable.userId, userId));
    } catch (error) {
      console.error('Error updating user settings:', error);
      throw error;
    }
  }

  // Guild settings
  static async createGuildSettings(settingsData: NewGuildSettings) {
    try {
      const [settings] = await db.insert(guildSettingsTable).values(settingsData).returning();
      return settings;
    } catch (error) {
      console.error('Error creating guild settings:', error);
      throw error;
    }
  }

  static async getGuildSettings(guildId: string) {
    try {
      const settings = await db.select().from(guildSettingsTable).where(eq(guildSettingsTable.guildId, guildId)).limit(1);
      return settings[0] || null;
    } catch (error) {
      console.error('Error getting guild settings:', error);
      throw error;
    }
  }

  static async updateGuildSettings(guildId: string, updates: Partial<NewGuildSettings>) {
    try {
      await db.update(guildSettingsTable)
        .set({ ...updates, updatedAt: new Date().toISOString() })
        .where(eq(guildSettingsTable.guildId, guildId));
    } catch (error) {
      console.error('Error updating guild settings:', error);
      throw error;
    }
  }
}
