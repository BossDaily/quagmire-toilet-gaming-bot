import { Events, Listener } from '@sapphire/framework';
import { EmbedBuilder, Message, ChannelType, MediaGalleryBuilder, MediaGalleryItemBuilder, WebhookMessageCreateOptions, MessageFlags } from 'discord.js';
import { drizzle } from 'drizzle-orm/libsql';
import { linkReplaceOptOutTable, messageForwardingTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export class UserEvent extends Listener<typeof Events.MessageCreate> {
	private twitterRegex = /https:\/\/(?:x|twitter)\.com\/([^\/]+)\/status\/(\d+)(?:\?.*)?/g;
	private instagramRegex = /https:\/\/(?:[a-zA-Z0-9-]+\.)?instagram\.com\/(reel|p)\/([^\/?]+)(?:\/|\?.*)?/g;

	public override async run(msg: Message) {
		try {
			// Ignore bot messages and DMs
			if (msg.author.bot || !msg.guild) {
				return;
			}

			// Handle link replacement first (before message forwarding)
			const shouldReplaceLinks = await this.handleLinkReplacement(msg);
			if (shouldReplaceLinks) {
				// If we're replacing links, don't do the channel forwarding for the original message
				// The webhook message will be processed separately
				return;
			}

			// Handle message forwarding logic
			await this.handleMessageForwarding(msg);
		} catch (error) {
			this.container.logger.fatal(error);
		}
	}

	private async handleLinkReplacement(message: Message): Promise<boolean> {
		try {
			// Check if user has opted out
			const db = drizzle({ connection: { url: process.env.DB_FILE_NAME! }});
			const [optOutRecord] = await db
				.select()
				.from(linkReplaceOptOutTable)
				.where(
					and(
						eq(linkReplaceOptOutTable.discordId, message.author.id),
						eq(linkReplaceOptOutTable.guildId, message.guild!.id),
						eq(linkReplaceOptOutTable.optedOut, true)
					)
				)
				.limit(1);

			if (optOutRecord) {
				return false;
			}

			const content = message.content;
			let hasTwitterLink = false;
			let hasInstagramLink = false;
			let newContent = content;

			// Remove Instagram tracking parameters (e.g., ?igsh=...)
			let cleanedContent = content.replace(/(https:\/\/(?:[a-zA-Z0-9-]+\.)?instagram\.com\/(reel|p)\/[^\/?\s]+)(\?igsh=[\w\d]+)?/g, '$1');

			// Check for Twitter/X links
			const twitterMatches = Array.from(cleanedContent.matchAll(this.twitterRegex));
			if (twitterMatches.length > 0) {
				hasTwitterLink = true;
				for (const match of twitterMatches) {
					const [fullMatch, username, statusId] = match;
					const replacementUrl = `[_](https://d.fxtwitter.com/${username}/status/${statusId})`;
					cleanedContent = cleanedContent.replace(fullMatch, replacementUrl);
				}
			}

			// Check for Instagram links
			const instagramMatches = Array.from(cleanedContent.matchAll(this.instagramRegex));
			if (instagramMatches.length > 0) {
				hasInstagramLink = true;
				for (const match of instagramMatches) {
					const [fullMatch, type, postId] = match;
					const replacementUrl = `[_](https://kkinstagram.com/${type}/${postId})`;
					cleanedContent = cleanedContent.replace(fullMatch, replacementUrl);
				}
			}

			newContent = cleanedContent;

			// If we found links to replace
			if (hasTwitterLink || hasInstagramLink) {
				await this.replaceWithWebhook(message, newContent);
				return true; // Indicate that we replaced the message
			}

			return false;
		} catch (error) {
			this.container.logger.error('[LinkReplace] Error in link replacement:', error);
			return false;
		}
	}

	private async replaceWithWebhook(originalMessage: Message, newContent: string) {
		try {
			const channel = originalMessage.channel;
			if (!channel.isTextBased()) {
				return;
			}

			// Get or create webhook for this channel
			let webhook;
			const webhooks = await originalMessage.guild?.fetchWebhooks();
			const existingWebhook = webhooks?.find(wh => wh.owner?.id === this.container.client.id && wh.channelId === channel.id);

			if (existingWebhook) {
				webhook = existingWebhook;
			} else {
				if (channel.type === ChannelType.GuildText) {
					webhook = await channel.createWebhook({
						name: 'Link Replace',
						reason: 'For replacing links in messages',
					});
				} else {
					return;
				}
			}

			// Prepare webhook message options
			const webhookOptions: WebhookMessageCreateOptions = {
				username: originalMessage.author.displayName || originalMessage.author.username,
				avatarURL: originalMessage.author.displayAvatarURL(),
				allowedMentions: {
					parse: ['users', 'roles'],
					repliedUser: false
				},
				content: newContent,
			};

			// Handle attachments if any
			if (originalMessage.attachments.size > 0) {
				const attachments = Array.from(originalMessage.attachments.values()).map(attachment => 
					new MediaGalleryBuilder()
            .addItems(
                new MediaGalleryItemBuilder()
                    .setURL(attachment.url),
            ),
				);
				webhookOptions.components = attachments;
				webhookOptions.flags = MessageFlags.IsComponentsV2
			}

			// Handle message reference (replies)
			if (originalMessage.reference) {
				try {
					const referencedMessage = await originalMessage.fetchReference();
					if (referencedMessage) {
						webhookOptions.content = `> **Replying to <@${referencedMessage.author.id}>:** ${referencedMessage.content.slice(0, 100)}${referencedMessage.content.length > 100 ? '...' : ''}\n${newContent}`;
					}
				} catch (error) {
					// If we can't fetch the reference, just send without it
					this.container.logger.warn('Could not fetch message reference:', error);
				}
			}

			// Send webhook message
			
			await webhook?.send(webhookOptions);

			// Delete original message
			await originalMessage.delete();
		} catch (error) {
			this.container.logger.error('[LinkReplace] Error replacing message with webhook:', error);
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
