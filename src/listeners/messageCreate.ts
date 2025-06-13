import { Events, Listener } from '@sapphire/framework';
import {  EmbedBuilder, Message } from 'discord.js';
import { DatabaseService } from '../lib/database';

export class UserEvent extends Listener<typeof Events.MessageCreate> {
	public override async run(msg: Message) {
		try {
			// Log user activity in database (skip bots)
			if (!msg.author.bot) {
				await this.logUserActivity(msg);
			}

			const channel = await msg.guild?.channels.fetch(msg.channel.id);

			if (channel?.parentId === '975503117904924673' && msg.guildId === '765801416680931328') {
				const sendChannel = await msg.guild?.channels.fetch('972146944354947124');

				if (sendChannel?.isTextBased()) {
					if (msg.content) {
						const embed = new EmbedBuilder()
							.setAuthor({
								name: msg.author.username,
								// @ts-ignore
								iconURL: msg.author.avatarURL()
							})
							// @ts-ignore
							.setColor("#0099ff")
							.setDescription(msg.content)
							.setTimestamp(msg.createdAt);

						sendChannel?.send({ embeds: [embed] });
					}

					if (msg.attachments) {
						if (!msg.content && msg.attachments.size > 0) {
							const embed = new EmbedBuilder()
								.setAuthor({
									name: msg.author.username,
									// @ts-ignore
									iconURL: msg.author.avatarURL()
								})
								// @ts-ignore
								.setColor("#0099ff")
								.setDescription(`${msg.author.username} attached:`);

							sendChannel?.send({ embeds: [embed] });
						}

						msg.attachments.map((attch) => sendChannel?.send({ content: attch.proxyURL }));
					}

					if (msg.embeds) {
						if (!msg.content && msg.embeds.length > 0) {
							const embed = new EmbedBuilder()
								.setAuthor({
									name: msg.author.username,
									// @ts-ignore
									iconURL: msg.author.avatarURL()
								})
								// @ts-ignore
								.setColor("#0099ff")
								.setDescription(`${msg.author.username} sent:`);

							sendChannel?.send({ embeds: [embed] });
						}

						msg.embeds.map((embed) => sendChannel?.send({ embeds: [embed] }));
					}

					if (msg.stickers) {
						if (!msg.content && msg.stickers.size > 0) {
							const embed = new EmbedBuilder()
								.setAuthor({
									name: msg.author.username,
									// @ts-ignore
									iconURL: msg.author.avatarURL()
								})
								// @ts-ignore
								.setColor("#0099ff")
								.setDescription(`${msg.author.username} sent some stickers!`);

							sendChannel?.send({ embeds: [embed] });
						}

						msg.stickers.map((sticker) => sendChannel?.send({ files: [sticker.url] }));
					}
				}
			} 
		} catch (error) {
			this.container.logger.fatal(error);
		}
	}

	private async logUserActivity(msg: Message) {
		try {
			// Check if user exists in database, create if not
			let user = await DatabaseService.getUserByDiscordId(msg.author.id);
			
			if (!user) {
				user = await DatabaseService.createUser({
					discordId: msg.author.id,
					username: msg.author.username,
					discriminator: msg.author.discriminator || '0',
					avatar: msg.author.avatar
				});
			} else {
				// Update last activity
				await DatabaseService.updateUserActivity(msg.author.id);
			}

			// Log guild if not exists
			if (msg.guild) {
				let guild = await DatabaseService.getGuildByDiscordId(msg.guild.id);
				
				if (!guild) {
					await DatabaseService.createGuild({
						discordId: msg.guild.id,
						name: msg.guild.name,
						memberCount: msg.guild.memberCount
					});
				} else {
					// Update member count if it has changed
					if (guild.memberCount !== msg.guild.memberCount) {
						await DatabaseService.updateGuildMemberCount(msg.guild.id, msg.guild.memberCount);
					}
				}
			}
		} catch (error) {
			// Don't throw error for database logging failures, just log them
			this.container.logger.error('Failed to log user activity to database:', error);
		}
	}
}
