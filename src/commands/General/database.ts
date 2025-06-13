import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { Message } from 'discord.js';
import { DatabaseService } from '../../lib/database';

@ApplyOptions<Command.Options>({
	description: 'Database management commands',
	requiredUserPermissions: ['Administrator']
})
export class UserCommand extends Command {
	public async messageRun(message: Message, args: Command.Args) {
		const subcommand = await args.pickResult('string');
		
		if (!subcommand.success) {
			return message.reply('Usage: `!db <stats|user-info>`');
		}

		try {
			switch (subcommand.value.toLowerCase()) {
				case 'stats':
					return this.handleStats(message);
				case 'user-info':
					return this.handleUserInfo(message, args);
				default:
					return message.reply('Available subcommands: `stats`, `user-info`');
			}
		} catch (error) {
			this.container.logger.error('Database command error:', error);
			return message.reply('An error occurred while executing the database command.');
		}
	}

	private async handleStats(message: Message) {
		try {
			// Get command usage stats
			const recentCommands = await DatabaseService.getCommandStats();
			const totalCommands = recentCommands.length;
			
			const embed = {
				title: '📊 Database Statistics',
				fields: [
					{
						name: 'Recent Commands',
						value: `${totalCommands} commands logged`,
						inline: true
					},
					{
						name: 'Database Status',
						value: '✅ Connected',
						inline: true
					}
				],
				color: 0x00ff00,
				timestamp: new Date().toISOString()
			};

			return message.reply({ embeds: [embed] });
		} catch (error) {
			this.container.logger.error('Stats command error:', error);
			return message.reply('Failed to retrieve database statistics.');
		}
	}

	private async handleUserInfo(message: Message, args: Command.Args) {
		try {
			const targetUser = await args.pickResult('user');
			const user = targetUser.success ? targetUser.value : message.author;

			// Check if user exists in database
			let dbUser = await DatabaseService.getUserByDiscordId(user.id);
			
			if (!dbUser) {
				// Create user if they don't exist
				dbUser = await DatabaseService.createUser({
					discordId: user.id,
					username: user.username,
					discriminator: user.discriminator || '0',
					avatar: user.avatar
				});
			}

			const embed = {
				title: `👤 User Information: ${user.username}`,
				fields: [
					{
						name: 'Discord ID',
						value: user.id,
						inline: true
					},
					{
						name: 'Database ID',
						value: dbUser.id.toString(),
						inline: true
					},
					{
						name: 'Last Active',
						value: dbUser.lastActive || 'Never',
						inline: true
					}
				],
				color: 0x0099ff,
				timestamp: new Date().toISOString()
			};

			return message.reply({ embeds: [embed] });
		} catch (error) {
			this.container.logger.error('User info command error:', error);
			return message.reply('Failed to retrieve user information.');
		}
	}
}
