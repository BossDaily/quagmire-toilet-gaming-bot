import { Events, Listener } from '@sapphire/framework';
import { Message, AttachmentBuilder, ChannelType } from 'discord.js';
import { drizzle } from 'drizzle-orm/libsql';
import { linkReplaceOptOutTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export class UserEvent extends Listener<typeof Events.MessageCreate> {
	private twitterRegex = /https:\/\/(?:x|twitter)\.com\/([^\/]+)\/status\/(\d+)(?:\?.*)?/g;
	private instagramRegex = /https:\/\/(?:[a-zA-Z0-9-]+\.)?instagram\.com\/(reel|p)\/([^\/?]+)(?:\/|\?.*)?/g;
	public override async run(message: Message) {
		// Ignore bot messages and DMs
		if (message.author.bot || !message.guild) {
			this.container.logger.debug(`[LinkReplace] Ignoring message: bot=${message.author.bot}, guild=${!!message.guild}`);
			return;
		}

		this.container.logger.debug(`[LinkReplace] Processing message from ${message.author.tag} in ${message.guild.name}#${message.channel.isTextBased() && 'name' in message.channel ? message.channel.name : 'unknown-channel'}`);

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

			if (optOutRecord) {
				this.container.logger.debug(`[LinkReplace] User ${message.author.tag} has opted out of link replacement`);
				return;
			}			const content = message.content;
			let hasTwitterLink = false;
			let hasInstagramLink = false;
			let newContent = content;

			this.container.logger.debug(`[LinkReplace] Analyzing message content: "${content.substring(0, 100)}${content.length > 100 ? '...' : ''}"`);

			// Check for Twitter/X links
			const twitterMatches = Array.from(content.matchAll(this.twitterRegex));
			if (twitterMatches.length > 0) {
				hasTwitterLink = true;
				this.container.logger.info(`[LinkReplace] Found ${twitterMatches.length} Twitter/X link(s) to replace`);
				for (const match of twitterMatches) {
					const [fullMatch, username, statusId] = match;
					const replacementUrl = `https://d.fxtwitter.com/${username}/status/${statusId}`;
					this.container.logger.debug(`[LinkReplace] Replacing Twitter link: ${fullMatch} -> ${replacementUrl}`);
					newContent = newContent.replace(fullMatch, replacementUrl);
				}
			}

			// Check for Instagram links
			const instagramMatches = Array.from(content.matchAll(this.instagramRegex));
			if (instagramMatches.length > 0) {
				hasInstagramLink = true;
				this.container.logger.info(`[LinkReplace] Found ${instagramMatches.length} Instagram link(s) to replace`);
				for (const match of instagramMatches) {
					const [fullMatch, type, postId] = match;
					const replacementUrl = `https://ddinstagram.com/${type}/${postId}`;
					this.container.logger.debug(`[LinkReplace] Replacing Instagram link: ${fullMatch} -> ${replacementUrl}`);
					newContent = newContent.replace(fullMatch, replacementUrl);
				}
			}			// If we found links to replace
			if (hasTwitterLink || hasInstagramLink) {
				this.container.logger.info(`[LinkReplace] Replacing message with ${hasTwitterLink ? 'Twitter' : ''}${hasTwitterLink && hasInstagramLink ? ' and ' : ''}${hasInstagramLink ? 'Instagram' : ''} link replacements`);
				await this.replaceWithWebhook(message, newContent);
			} else {
				this.container.logger.debug(`[LinkReplace] No links to replace found in message`);
			}		} catch (error) {
			this.container.logger.error(`[LinkReplace] Error in link replace listener for message ${message.id} from ${message.author.tag}:`, error);
		}
	}
	private async replaceWithWebhook(originalMessage: Message, newContent: string) {
		this.container.logger.debug(`[LinkReplace] Starting webhook replacement process`);
		
		try {
			const channel = originalMessage.channel;
			if (!channel.isTextBased()) {
				this.container.logger.warn(`[LinkReplace] Channel is not text-based, cannot replace message`);
				return;
			}

			this.container.logger.debug(`[LinkReplace] Working with channel: ${channel.id}`);

			// Get or create webhook for this channel
			let webhook;
			const webhooks = await originalMessage.guild?.fetchWebhooks();
			const existingWebhook = webhooks?.find(wh => wh.owner?.id === this.container.client.id  && wh.channelId === channel.id);

			if (existingWebhook) {
				webhook = existingWebhook;
				this.container.logger.debug(`[LinkReplace] Using existing webhook: ${webhook.name} (${webhook.id})`);
			} else {
				this.container.logger.debug(`[LinkReplace] Creating new webhook for channel`);
        if (channel.type === ChannelType.GuildText) { 
          webhook = await channel.createWebhook({
            name: 'Link Replace',
            reason: 'For replacing links in messages',
          });
					this.container.logger.info(`[LinkReplace] Created new webhook: ${webhook.name} (${webhook.id})`);
        } else {
					this.container.logger.warn(`[LinkReplace] Cannot create webhook for channel type: ${channel.type}`);
					return;
				}
			}			// Prepare webhook message options
			const webhookOptions: any = {
				content: newContent,
				username: originalMessage.author.displayName || originalMessage.author.username,
				avatarURL: originalMessage.author.displayAvatarURL(),
				allowedMentions: {
					parse: ['users', 'roles'],
					repliedUser: false
				}
			};

			this.container.logger.debug(`[LinkReplace] Preparing webhook message for user: ${webhookOptions.username}`);

			// Handle attachments if any
			if (originalMessage.attachments.size > 0) {
				this.container.logger.debug(`[LinkReplace] Processing ${originalMessage.attachments.size} attachment(s)`);
				const attachments = Array.from(originalMessage.attachments.values()).map(attachment => 
					new AttachmentBuilder(attachment.url, { name: attachment.name })
				);
				webhookOptions.files = attachments;
			}

			// Handle message reference (replies)
			if (originalMessage.reference) {
				this.container.logger.debug(`[LinkReplace] Message is a reply, fetching referenced message`);
				try {
					const referencedMessage = await originalMessage.fetchReference();
					if (referencedMessage) {
						webhookOptions.content = `> **Replying to ${referencedMessage.author.displayName || referencedMessage.author.username}:** ${referencedMessage.content.slice(0, 100)}${referencedMessage.content.length > 100 ? '...' : ''}\n${newContent}`;
						this.container.logger.debug(`[LinkReplace] Added reply context to webhook message`);
					}
				} catch (error) {
					// If we can't fetch the reference, just send without it
					this.container.logger.warn('Could not fetch message reference:', error);
				}
			}

			// Send webhook message
			this.container.logger.debug(`[LinkReplace] Sending webhook message`);
			const webhookMessage = await webhook?.send(webhookOptions);
			this.container.logger.info(`[LinkReplace] Successfully sent webhook message: ${webhookMessage?.id}`);

			// Delete original message
			this.container.logger.debug(`[LinkReplace] Deleting original message: ${originalMessage.id}`);
			await originalMessage.delete();
			this.container.logger.info(`[LinkReplace] Successfully replaced message from ${originalMessage.author.tag}`);
		} catch (error) {
			this.container.logger.error(`[LinkReplace] Error replacing message ${originalMessage.id} with webhook:`, error);
		}
	}
}
