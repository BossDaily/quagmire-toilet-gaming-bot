import { ApplyOptions } from '@sapphire/decorators';
import { Subcommand } from '@sapphire/plugin-subcommands';
import { drizzle } from 'drizzle-orm/libsql';
import { linkReplaceOptOutTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { EmbedBuilder } from 'discord.js';

@ApplyOptions<Subcommand.Options>({
	description: 'Manage link replacement settings',
	subcommands: [
		{
			name: 'optout',
			chatInputRun: 'chatInputOptOut'
		},
		{
			name: 'optin',
			chatInputRun: 'chatInputOptIn'
		},
		{
			name: 'status',
			chatInputRun: 'chatInputStatus'
		}
	]
})
export class LinkReplaceCommand extends Subcommand {
	public override registerApplicationCommands(registry: Subcommand.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('link-replace')
				.setDescription('Manage link replacement settings')
				.addSubcommand((subcommand) =>
					subcommand
						.setName('optout')
						.setDescription('Opt out of automatic link replacement')
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('optin')
						.setDescription('Opt back in to automatic link replacement')
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('status')
						.setDescription('Check your current link replacement status')
				)
		);
	}

	public async chatInputOptOut(interaction: Subcommand.ChatInputCommandInteraction) {
		if (!interaction.guild) {
			return interaction.reply({
				content: 'This command can only be used in a server!',
				ephemeral: true
			});
		}

		try {
			const db = drizzle({ connection: { url: process.env.DB_FILE_NAME! }});
			
			// Check if user already has a record
			const [existingRecord] = await db
				.select()
				.from(linkReplaceOptOutTable)
				.where(
					and(
						eq(linkReplaceOptOutTable.discordId, interaction.user.id),
						eq(linkReplaceOptOutTable.guildId, interaction.guild.id)
					)
				)
				.limit(1);

			if (existingRecord) {
				if (existingRecord.optedOut) {
					return interaction.reply({
						content: 'You are already opted out of link replacement!',
						ephemeral: true
					});
				}
				
				// Update existing record
				await db
					.update(linkReplaceOptOutTable)
					.set({
						optedOut: true,
						optOutDate: new Date()
					})
					.where(eq(linkReplaceOptOutTable.id, existingRecord.id));
			} else {
				// Create new record
				await db
					.insert(linkReplaceOptOutTable)
					.values({
						discordId: interaction.user.id,
						guildId: interaction.guild.id,
						optedOut: true,
						optOutDate: new Date()
					});
			}

			const embed = new EmbedBuilder()
				.setColor('#ff6b6b')
				.setTitle('✅ Opted Out Successfully')
				.setDescription('You have been opted out of automatic link replacement. Your Twitter/X and Instagram links will no longer be automatically replaced with better embed versions.')
				.setFooter({ text: 'You can opt back in anytime using /link-replace optin' });

			return interaction.reply({ embeds: [embed], ephemeral: true });

		} catch (error) {
			this.container.logger.error('Error in link-replace optout command:', error);
			return interaction.reply({
				content: 'An error occurred while processing your request. Please try again later.',
				ephemeral: true
			});
		}
	}

	public async chatInputOptIn(interaction: Subcommand.ChatInputCommandInteraction) {
		if (!interaction.guild) {
			return interaction.reply({
				content: 'This command can only be used in a server!',
				ephemeral: true
			});
		}

		try {
			const db = drizzle({ connection: { url: process.env.DB_FILE_NAME! }});
			
			// Check if user has a record
			const [existingRecord] = await db
				.select()
				.from(linkReplaceOptOutTable)
				.where(
					and(
						eq(linkReplaceOptOutTable.discordId, interaction.user.id),
						eq(linkReplaceOptOutTable.guildId, interaction.guild.id)
					)
				)
				.limit(1);

			if (!existingRecord || !existingRecord.optedOut) {
				return interaction.reply({
					content: 'You are already opted in to link replacement!',
					ephemeral: true
				});
			}

			// Update record to opt back in
			await db
				.update(linkReplaceOptOutTable)
				.set({
					optedOut: false,
					optOutDate: null
				})
				.where(eq(linkReplaceOptOutTable.id, existingRecord.id));

			const embed = new EmbedBuilder()
				.setColor('#4ecdc4')
				.setTitle('✅ Opted In Successfully')
				.setDescription('You have been opted back in to automatic link replacement. Your Twitter/X and Instagram links will now be automatically replaced with better embed versions.')
				.setFooter({ text: 'You can opt out anytime using /link-replace optout' });

			return interaction.reply({ embeds: [embed], ephemeral: true });

		} catch (error) {
			this.container.logger.error('Error in link-replace optin command:', error);
			return interaction.reply({
				content: 'An error occurred while processing your request. Please try again later.',
				ephemeral: true
			});
		}
	}

	public async chatInputStatus(interaction: Subcommand.ChatInputCommandInteraction) {
		if (!interaction.guild) {
			return interaction.reply({
				content: 'This command can only be used in a server!',
				ephemeral: true
			});
		}

		try {
			const db = drizzle({ connection: { url: process.env.DB_FILE_NAME! }});
			
			const [record] = await db
				.select()
				.from(linkReplaceOptOutTable)
				.where(
					and(
						eq(linkReplaceOptOutTable.discordId, interaction.user.id),
						eq(linkReplaceOptOutTable.guildId, interaction.guild.id)
					)
				)
				.limit(1);

			const isOptedOut = record?.optedOut ?? false;
			const optOutDate = record?.optOutDate;

			const embed = new EmbedBuilder()
				.setColor(isOptedOut ? '#ff6b6b' : '#4ecdc4')
				.setTitle('Link Replacement Status')
				.setDescription(
					isOptedOut
						? '❌ You are currently **opted out** of automatic link replacement.'
						: '✅ You are currently **opted in** to automatic link replacement.'
				)
				.addFields([
					{
						name: 'What this means',
						value: isOptedOut
							? 'Your Twitter/X and Instagram links will not be automatically replaced with better embed versions.'
							: 'Your Twitter/X and Instagram links will be automatically replaced with better embed versions.',
						inline: false
					}
				]);

			if (isOptedOut && optOutDate) {
				embed.addFields([
					{
						name: 'Opted out since',
						value: `<t:${Math.floor(optOutDate.getTime() / 1000)}:F>`,
						inline: false
					}
				]);
			}

			embed.setFooter({ 
				text: isOptedOut 
					? 'Use /link-replace optin to opt back in' 
					: 'Use /link-replace optout to opt out' 
			});

			return interaction.reply({ embeds: [embed], ephemeral: true });

		} catch (error) {
			this.container.logger.error('Error in link-replace status command:', error);
			return interaction.reply({
				content: 'An error occurred while processing your request. Please try again later.',
				ephemeral: true
			});
		}
	}
}
