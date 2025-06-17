import { Events, Listener } from '@sapphire/framework';
import { Message, AttachmentBuilder, ChannelType } from 'discord.js';
import { drizzle } from 'drizzle-orm/libsql';
import { linkReplaceOptOutTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export class LinkReplaceListener extends Listener<typeof Events.MessageCreate> {
	private twitterRegex = /https:\/\/(?:x|twitter)\.com\/([^\/]+)\/status\/(\d+)(?:\?.*)?/g;
	private instagramRegex = /https:\/\/(?:[a-zA-Z0-9-]+\.)?instagram\.com\/(reel|p)\/([^\/?]+)(?:\/|\?.*)?/g;

	public override async run(message: Message) {
		// Ignore bot messages and DMs
		if (message.author.bot || !message.guild) return;

		try {
			// Check if user has opted out
			const db = drizzle({ connection: { url: process.env.DB_FILE_NAME! }});
			const [optOutRecord] = await db
				.select()
				.from(linkReplaceOptOutTable)
				.where(
					and(
						eq(linkReplaceOptOutTable.discordId, message.author.id),
						eq(linkReplaceOptOutTable.guildId, message.guild.id),
						eq(linkReplaceOptOutTable.optedOut, true)
					)
				)
				.limit(1);

			if (optOutRecord) return;

			const content = message.content;
			let hasTwitterLink = false;
			let hasInstagramLink = false;
			let newContent = content;

			// Check for Twitter/X links
			const twitterMatches = Array.from(content.matchAll(this.twitterRegex));
			if (twitterMatches.length > 0) {
				hasTwitterLink = true;
				for (const match of twitterMatches) {
					const [fullMatch, username, statusId] = match;
					const replacementUrl = `https://d.fxtwitter.com/${username}/status/${statusId}`;
					newContent = newContent.replace(fullMatch, replacementUrl);
				}
			}			// Check for Instagram links
			const instagramMatches = Array.from(content.matchAll(this.instagramRegex));
			if (instagramMatches.length > 0) {
				hasInstagramLink = true;
				for (const match of instagramMatches) {
					const [fullMatch, type, postId] = match;
					const replacementUrl = `https://ddinstagram.com/${type}/${postId}`;
					newContent = newContent.replace(fullMatch, replacementUrl);
				}
			}

			// If we found links to replace
			if (hasTwitterLink || hasInstagramLink) {
				await this.replaceWithWebhook(message, newContent);
			}
		} catch (error) {
			this.container.logger.error('Error in link replace listener:', error);
		}
	}

	private async replaceWithWebhook(originalMessage: Message, newContent: string) {
		try {
			const channel = originalMessage.channel;
			if (!channel.isTextBased()) return;

			// Get or create webhook for this channel
			let webhook;
			const webhooks = await originalMessage.guild?.fetchWebhooks();
			const existingWebhook = webhooks?.find(wh => wh.owner?.id === this.container.client.id  && wh.channelId === channel.id);

			if (existingWebhook) {
				webhook = existingWebhook;
			} else {
        if (channel.type === ChannelType.GuildText) { 
          channel.createWebhook({
            name: 'Link Replace',
            reason: 'For replacing links in messages',
          });
        }
			}

			// Prepare webhook message options
			const webhookOptions: any = {
				content: newContent,
				username: originalMessage.author.displayName || originalMessage.author.username,
				avatarURL: originalMessage.author.displayAvatarURL(),
				allowedMentions: {
					parse: ['users', 'roles'],
					repliedUser: false
				}
			};

			// Handle attachments if any
			if (originalMessage.attachments.size > 0) {
				const attachments = Array.from(originalMessage.attachments.values()).map(attachment => 
					new AttachmentBuilder(attachment.url, { name: attachment.name })
				);
				webhookOptions.files = attachments;
			}

			// Handle message reference (replies)
			if (originalMessage.reference) {
				try {
					const referencedMessage = await originalMessage.fetchReference();
					if (referencedMessage) {
						webhookOptions.content = `> **Replying to ${referencedMessage.author.displayName || referencedMessage.author.username}:** ${referencedMessage.content.slice(0, 100)}${referencedMessage.content.length > 100 ? '...' : ''}\n${newContent}`;
					}
				} catch (error) {
					// If we can't fetch the reference, just send without it
					this.container.logger.debug('Could not fetch message reference:', error);
				}
			}

			// Send webhook message
			await webhook?.send(webhookOptions);

			// Delete original message
			await originalMessage.delete();

		} catch (error) {
			this.container.logger.error('Error replacing message with webhook:', error);
		}
	}
}
