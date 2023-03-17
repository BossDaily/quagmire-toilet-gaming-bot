import { Events, Listener } from '@sapphire/framework';
import {  EmbedBuilder, Message } from 'discord.js';

export class UserEvent extends Listener<typeof Events.MessageCreate> {
	public override async run(msg: Message) {
		try {
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

						msg.attachments.map((attch) => sendChannel?.send({ files: [attch] }));
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
}
