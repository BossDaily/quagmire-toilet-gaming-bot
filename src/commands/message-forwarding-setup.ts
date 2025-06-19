import { Command } from '@sapphire/framework';
import { 
  ChatInputCommandInteraction, 
  SlashCommandBuilder, 
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  ComponentType,
  EmbedBuilder,
  ChannelType
} from 'discord.js';
import { drizzle } from 'drizzle-orm/libsql';
import { messageForwardingTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export class MessageForwardingSetupCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options });
  }
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      new SlashCommandBuilder()
        .setName('setup-forwarding')
        .setDescription('Setup message forwarding from a category to a channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false)
    );
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction): Promise<void> {    if (!interaction.guild) {
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
      // Get all categories in the guild
      const categories = interaction.guild.channels.cache
        .filter(channel => channel.type === ChannelType.GuildCategory)
        .map(category => ({
          label: category.name,
          value: category.id,
          description: `Category: ${category.name}`
        }));      if (categories.length === 0) {
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
        .setTitle('Message Forwarding Setup')
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
        filter: (i) => i.customId === 'category-select' && i.user.id === interaction.user.id,
        time: 60000,
      });

      categoryCollector.on('collect', async (categoryInteraction) => {
        const selectedCategoryId = categoryInteraction.values[0];
        const selectedCategory = interaction.guild!.channels.cache.get(selectedCategoryId);

        // Get all text channels in the guild (excluding channels in the selected category)
        const textChannels = interaction.guild!.channels.cache
          .filter(channel => 
            channel.type === ChannelType.GuildText && 
            channel.parentId !== selectedCategoryId
          )
          .map(channel => ({
            label: channel.name,
            value: channel.id,
            description: `#${channel.name}`
          }));

        if (textChannels.length === 0) {
          return categoryInteraction.update({
            content: 'No available text channels found for forwarding.',
            embeds: [],
            components: [],
          });
        }

        // Create target channel select menu
        const channelSelect = new StringSelectMenuBuilder()
          .setCustomId('target-channel-select')
          .setPlaceholder('Select target channel for forwarding')
          .addOptions(textChannels.slice(0, 25));

        const channelRow = new ActionRowBuilder<StringSelectMenuBuilder>()
          .addComponents(channelSelect);

        const updatedEmbed = new EmbedBuilder()
          .setTitle('Message Forwarding Setup')
          .setDescription(`Selected category: **${selectedCategory?.name}**\n\nNow select the target channel where messages should be forwarded:`)
          .setColor('#0099ff');

        await categoryInteraction.update({
          embeds: [updatedEmbed],
          components: [channelRow],
        });

        // Wait for target channel selection
        const channelCollector = response.createMessageComponentCollector({
          componentType: ComponentType.StringSelect,
          filter: (i) => i.customId === 'target-channel-select' && i.user.id === interaction.user.id,
          time: 60000,
        });

        channelCollector.on('collect', async (channelInteraction) => {
          const selectedChannelId = channelInteraction.values[0];
          const selectedChannel = interaction.guild!.channels.cache.get(selectedChannelId);

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
              .setTitle('✅ Message Forwarding Setup Complete')
              .setDescription(
                `**Configuration saved successfully!**\n\n` +
                `📁 **Category:** ${selectedCategory?.name}\n` +
                `📤 **Target Channel:** ${selectedChannel?.name}\n\n` +
                `All messages sent in channels within the "${selectedCategory?.name}" category will now be forwarded to #${selectedChannel?.name}.`
              )
              .setColor('#00ff00');

            await channelInteraction.update({
              embeds: [successEmbed],
              components: [],
            });

          } catch (error) {
            this.container.logger.error('Error saving forwarding configuration:', error);
            
            const errorEmbed = new EmbedBuilder()
              .setTitle('❌ Setup Failed')
              .setDescription('There was an error saving the configuration. Please try again.')
              .setColor('#ff0000');

            await channelInteraction.update({
              embeds: [errorEmbed],
              components: [],
            });
          }
        });

        channelCollector.on('end', (collected) => {
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
      });

      categoryCollector.on('end', (collected) => {
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
      });    } catch (error) {
      this.container.logger.error('Error in message forwarding setup:', error);
      
      await interaction.reply({
        content: 'An error occurred while setting up message forwarding.',
        ephemeral: true,
      });
    }
  }
}
