import { Events, Listener } from '@sapphire/framework';
import { EmbedBuilder, Message } from 'discord.js';
import { drizzle } from 'drizzle-orm/libsql';
import { messageForwardingTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export class UserEvent extends Listener<typeof Events.MessageCreate> {
	public override async run(msg: Message) {
		try {
			// Ignore DMs
			if (!msg.guild) {
				return;
			}

			// Only handle message forwarding logic
			await this.handleMessageForwarding(msg);
		} catch (error) {
			this.container.logger.fatal(error);
		}
	}

	private async handleMessageForwarding(msg: Message) {
		try {
			// Get forwarding configuration from database
			const db = drizzle({ connection: { url: process.env.DB_FILE_NAME! }});
			const [forwardingConfig] = await db
				.select()
				.from(messageForwardingTable)
				.where(eq(messageForwardingTable.guildId, msg.guild!.id))
				.limit(1);

			// If no configuration exists, don't forward
			if (!forwardingConfig) {
				return;
			}

			const channel = await msg.guild?.channels.fetch(msg.channel.id);

			// Check if the message is from a channel in the configured category
			if (channel?.parentId === forwardingConfig.categoryId) {
				const sendChannel = await msg.guild?.channels.fetch(forwardingConfig.targetChannelId);

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
			this.container.logger.error('Error in message forwarding:', error);
		}
	}
}
