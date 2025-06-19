import { ApplyOptions } from '@sapphire/decorators';
import { Subcommand } from '@sapphire/plugin-subcommands';
import { 
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  ComponentType,
  EmbedBuilder,
  ChannelType,
  ChannelSelectMenuBuilder
} from 'discord.js';
import { drizzle } from 'drizzle-orm/libsql';
import { messageForwardingTable } from '../db/schema';
import { eq } from 'drizzle-orm';

@ApplyOptions<Subcommand.Options>({
	description: 'Manage message forwarding settings',
	subcommands: [
		{
			name: 'setup',
			chatInputRun: 'chatInputSetup'
		},
		{
			name: 'edit',
			chatInputRun: 'chatInputEdit'
		},
		{
			name: 'status',
			chatInputRun: 'chatInputStatus'
		}
	]
})
export class MessageForwardingCommand extends Subcommand {
	public override registerApplicationCommands(registry: Subcommand.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('msg-forwarding')
				.setDescription('Manage message forwarding settings')
				.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('setup')
						.setDescription('Setup message forwarding from a category to a channel')
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('edit')
						.setDescription('Edit existing message forwarding configuration')
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('status')
						.setDescription('Check current message forwarding configuration')
				)
		);
	}

	public async chatInputSetup(interaction: Subcommand.ChatInputCommandInteraction) {
		return this.handleSetupOrEdit(interaction, 'setup');
	}

	public async chatInputEdit(interaction: Subcommand.ChatInputCommandInteraction) {
		return this.handleSetupOrEdit(interaction, 'edit');
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
			
			const [config] = await db
				.select()
				.from(messageForwardingTable)
				.where(eq(messageForwardingTable.guildId, interaction.guild.id))
				.limit(1);

			if (!config) {
				const embed = new EmbedBuilder()
					.setColor('#ff6b6b')
					.setTitle('❌ No Configuration Found')
					.setDescription('Message forwarding is not configured for this server.')
					.setFooter({ text: 'Use /msg-forwarding setup to configure it' });

				return interaction.reply({ embeds: [embed], ephemeral: true });
			}

			const category = interaction.guild.channels.cache.get(config.categoryId);
			const targetChannel = interaction.guild.channels.cache.get(config.targetChannelId);

			const embed = new EmbedBuilder()
				.setColor('#4ecdc4')
				.setTitle('📋 Message Forwarding Status')
				.setDescription('Current message forwarding configuration:')
				.addFields([
					{
						name: '📁 Source Category',
						value: category ? `**${category.name}** (${category.id})` : `⚠️ Category not found (${config.categoryId})`,
						inline: false
					},
					{
						name: '📤 Target Channel',
						value: targetChannel ? `<#${targetChannel.id}>` : `⚠️ Channel not found (${config.targetChannelId})`,
						inline: false
					},
					{
						name: '📅 Last Updated',
						value: `<t:${Math.floor(config.updatedAt.getTime() / 1000)}:F>`,
						inline: false
					}
				])
				.setFooter({ text: 'Use /msg-forwarding edit to modify the configuration' });

			return interaction.reply({ embeds: [embed], ephemeral: true });

		} catch (error) {
			this.container.logger.error('Error in msg-forwarding status command:', error);
			return interaction.reply({
				content: 'An error occurred while checking the configuration. Please try again later.',
				ephemeral: true
			});
		}
	}
	private async handleSetupOrEdit(interaction: Subcommand.ChatInputCommandInteraction, mode: 'setup' | 'edit'): Promise<void> {
		if (!interaction.guild) {
			await interaction.reply({
				content: 'This command can only be used in a server.',
				ephemeral: true,
			});
			return;
		}

		// Check if user has administrator permissions
		if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
			await interaction.reply({
				content: 'You need Administrator permissions to use this command.',
				ephemeral: true,
			});
			return;
		}

		try {
			// For edit mode, check if configuration exists
			if (mode === 'edit') {
				const db = drizzle({ connection: { url: process.env.DB_FILE_NAME! }});
				const [existingConfig] = await db
					.select()
					.from(messageForwardingTable)
					.where(eq(messageForwardingTable.guildId, interaction.guild.id))
					.limit(1);

				if (!existingConfig) {
					await interaction.reply({
						content: 'No message forwarding configuration found. Use `/msg-forwarding setup` to create one first.',
						ephemeral: true,
					});
					return;
				}
			}

			// Get all categories in the guild
			const categories = interaction.guild.channels.cache
				.filter((channel: any) => channel.type === ChannelType.GuildCategory)
				.map((category: any) => ({
					label: category.name,
					value: category.id,
					description: `Category: ${category.name}`
				}));

			if (categories.length === 0) {
				await interaction.reply({
					content: 'No categories found in this server.',
					ephemeral: true,
				});
				return;
			}

			// Create category select menu
			const categorySelect = new StringSelectMenuBuilder()
				.setCustomId('category-select')
				.setPlaceholder('Select a category to monitor')
				.addOptions(categories.slice(0, 25)); // Discord limit of 25 options

			const categoryRow = new ActionRowBuilder<StringSelectMenuBuilder>()
				.addComponents(categorySelect);

			const embed = new EmbedBuilder()
				.setTitle(`Message Forwarding ${mode === 'setup' ? 'Setup' : 'Edit'}`)
				.setDescription('Select a category to monitor for message forwarding:')
				.setColor('#0099ff');

			const response = await interaction.reply({
				embeds: [embed],
				components: [categoryRow],
				ephemeral: true,
			});

			// Wait for category selection
			const categoryCollector = response.createMessageComponentCollector({
				componentType: ComponentType.StringSelect,
				filter: (i: any) => i.customId === 'category-select' && i.user.id === interaction.user.id,
				time: 60000,
			});

			categoryCollector.on('collect', (categoryInteraction: any) => {
				(async () => {
					const selectedCategoryId = categoryInteraction.values[0];
					const selectedCategory = interaction.guild!.channels.cache.get(selectedCategoryId);

					// Create target channel select menu
					const channelSelect = new ChannelSelectMenuBuilder()
						.setCustomId('target-channel-select')
						.setPlaceholder('Select target channel for forwarding')
						.addChannelTypes([ChannelType.GuildText]);

					const channelRow = new ActionRowBuilder<ChannelSelectMenuBuilder>()
						.addComponents(channelSelect);

					const updatedEmbed = new EmbedBuilder()
						.setTitle(`Message Forwarding ${mode === 'setup' ? 'Setup' : 'Edit'}`)
						.setDescription(`Selected category: **${selectedCategory?.name}**\n\nNow select the target channel where messages should be forwarded:`)
						.setColor('#0099ff');

					await categoryInteraction.update({
						embeds: [updatedEmbed],
						components: [channelRow],
					});

					// Wait for target channel selection
					const channelCollector = response.createMessageComponentCollector({
						componentType: ComponentType.ChannelSelect,
						filter: (i: any) => i.customId === 'target-channel-select' && i.user.id === interaction.user.id,
						time: 60000,
					});					channelCollector.on('collect', async (channelInteraction: any) => {
						const selectedChannelId = channelInteraction.values[0];

						try {
							// Save to database
							const db = drizzle({ connection: { url: process.env.DB_FILE_NAME! }});
							
							// Check if configuration already exists
							const [existingConfig] = await db
								.select()
								.from(messageForwardingTable)
								.where(eq(messageForwardingTable.guildId, interaction.guild!.id))
								.limit(1);

							if (existingConfig) {
								// Update existing configuration
								await db
									.update(messageForwardingTable)
									.set({
										categoryId: selectedCategoryId,
										targetChannelId: selectedChannelId,
										updatedAt: new Date(),
									})
									.where(eq(messageForwardingTable.guildId, interaction.guild!.id));
							} else {
								// Insert new configuration
								await db
									.insert(messageForwardingTable)
									.values({
										guildId: interaction.guild!.id,
										categoryId: selectedCategoryId,
										targetChannelId: selectedChannelId,
										createdAt: new Date(),
										updatedAt: new Date(),
									});
							}

							const successEmbed = new EmbedBuilder()
								.setTitle(`✅ Message Forwarding ${mode === 'setup' ? 'Setup' : 'Update'} Complete`)
								.setDescription(
									`**Configuration ${mode === 'setup' ? 'created' : 'updated'} successfully!**\n\n` +
									`📁 **Category:** ${selectedCategory?.name}\n` +
									`📤 **Target Channel:** <#${selectedChannelId}>\n\n` +
									`All messages sent in channels within the "${selectedCategory?.name}" category will now be forwarded to <#${selectedChannelId}>.`
								)
								.setColor('#00ff00');

							await channelInteraction.update({
								embeds: [successEmbed],
								components: [],
							});

						} catch (error) {
							this.container.logger.error('Error saving forwarding configuration:', error);
							
							const errorEmbed = new EmbedBuilder()
								.setTitle(`❌ ${mode === 'setup' ? 'Setup' : 'Update'} Failed`)
								.setDescription('There was an error saving the configuration. Please try again.')
								.setColor('#ff0000');

							await channelInteraction.update({
								embeds: [errorEmbed],
								components: [],
							});
						}
					});

					channelCollector.on('end', (collected: any) => {
						if (collected.size === 0) {
							const timeoutEmbed = new EmbedBuilder()
								.setTitle('⏰ Setup Timeout')
								.setDescription('Setup timed out. Please run the command again.')
								.setColor('#ff9900');

							categoryInteraction.editReply({
								embeds: [timeoutEmbed],
								components: [],
							}).catch(() => {});
						}
					});
				})();
			});

			categoryCollector.on('end', (collected: any) => {
				if (collected.size === 0) {
					const timeoutEmbed = new EmbedBuilder()
						.setTitle('⏰ Setup Timeout')
						.setDescription('Setup timed out. Please run the command again.')
						.setColor('#ff9900');

					interaction.editReply({
						embeds: [timeoutEmbed],
						components: [],
					}).catch(() => {});
				}
			});

		} catch (error) {
			this.container.logger.error('Error in message forwarding setup:', error);
			
			await interaction.reply({
				content: 'An error occurred while setting up message forwarding.',
				ephemeral: true,
			});
		}
	}
}
