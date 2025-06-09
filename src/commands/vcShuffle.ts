import { ApplyOptions } from '@sapphire/decorators';
import { Command, CommandOptionsRunTypeEnum, BucketScope } from '@sapphire/framework';
import { Time } from '@sapphire/time-utilities';
import { ApplicationCommandType, ChannelType, type VoiceChannel } from 'discord.js';


@ApplyOptions<Command.Options>({
	description: 'This command shuffles the user around several voice channels to get their attention.',
	name: 'VC Shuffle',
	cooldownDelay: Time.Minute * 1, // 1 minutes cooldown
	cooldownScope: BucketScope.User,
	runIn: CommandOptionsRunTypeEnum.GuildVoice,
})
export class UserCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerContextMenuCommand((builder) =>
			builder //
				.setName(this.name)
				.setType(ApplicationCommandType.User)
		);
	}

	public override async contextMenuRun(interaction: Command.ContextMenuCommandInteraction) {
		
		// Get the command user as a guild member
		const commandUser = await interaction.guild?.members.fetch(interaction.user.id);
		
		if (!commandUser) {
			return interaction.reply({ 
				content: '❌ Could not find you in this server.', 
				flags: 64, 
			});
		}
		
		// Check if the command user is in a voice channel
		const commandUserVoiceChannel = commandUser.voice.channel;
		
		if (!commandUserVoiceChannel) {
			return interaction.reply({ 
				content: '❌ You must be in a voice channel to use this command.', 
				flags: 64, 
			});
		}
		
		// Get the target user as a guild member to access voice state
		const targetMember = await interaction.guild?.members.fetch(interaction.targetId);
		
		if (!targetMember) {
			return interaction.reply({ 
				content: '❌ Could not find the target user in this server.', 
				flags: 64, 
			});
		}
		
		// Check if the target user is a bot
		if (targetMember.user.bot) {
			return interaction.reply({ 
				content: '❌ You cannot shuffle bots.', 
				flags: 64, 
			});
		}
		
		// Check if the target user is in a voice channel
		const voiceChannel = targetMember.voice?.channel;
		const targetVoiceState = targetMember.voice;
		this.container.logger.debug(`Target voice state for ${targetMember.displayName} (${targetMember.id}):`, {
			selfMute: targetVoiceState.selfMute,
			selfDeaf: targetVoiceState.selfDeaf,
			serverMute: targetVoiceState.serverMute,
			serverDeaf: targetVoiceState.serverDeaf,
			channelId: voiceChannel?.id,
			channelName: voiceChannel?.name
		});
		
		if (!voiceChannel) {
			return interaction.reply({ 
				content: `❌ ${targetMember.displayName} is not currently in a voice channel.`, 
				flags: 64, 
			});
		}
		
		// Check if both users are in the same voice channel
		if (commandUserVoiceChannel.id !== voiceChannel.id) {
			return interaction.reply({ 
				content: `❌ You must be in the same voice channel as ${targetMember.displayName} to shuffle them.`, 
				flags: 64, 
			});
		}
		
		// Check if the target user is muted or deafened
		if (!(targetVoiceState.selfMute || targetVoiceState.selfDeaf || targetVoiceState.serverMute || targetVoiceState.serverDeaf)) {
			return interaction.reply({ 
				content: `❌ ${targetMember.displayName} is not muted or deafened. You cannot shuffle people unless they're muted or deafened.`,
				flags: 64, // Ephemeral flag 
			});
		}
		
		// Store the target user and their current voice channel
		const targetUserObj = targetMember;
		const currentVoiceChannel = voiceChannel;
		
		// Get all accessible voice channels in the guild
		const accessibleVoiceChannels = interaction.guild?.channels.cache
			.filter(channel => 
				channel.type === ChannelType.GuildVoice && 
				channel.permissionsFor(targetUserObj)?.has('Connect') &&
				channel.id !== currentVoiceChannel.id // Exclude current channel
			)
			.map(channel => channel as VoiceChannel) || [];
		
		if (accessibleVoiceChannels.length === 0) {
			return interaction.reply({ 
				content: `❌ No other accessible voice channels found for ${targetUserObj.displayName}.`, 
				flags: 64 
			});
		}
		
		// Start the shuffling process
		await interaction.reply({ 
			content: `🔀 Starting shuffle for <@${targetUserObj.id}>! Moving them around ${accessibleVoiceChannels.length + 1} channels...`
		});
		
		// Shuffle function
		const shuffleUser = async () => {
			const shuffleRounds = 8; // Number of times to move the user
			const moveDelay = 1000; // 1 second between moves
			let shuffleCancelled = false;
			
			for (let i = 0; i < shuffleRounds; i++) {
				// Check if user has unmuted or undeafened during shuffle
				const currentVoiceState = targetUserObj.voice;
				if (!(currentVoiceState.selfMute || currentVoiceState.selfDeaf || currentVoiceState.serverMute || currentVoiceState.serverDeaf)) {
					shuffleCancelled = true;
					this.container.logger.info(`${targetUserObj.displayName} (${targetUserObj.id}) unmuted/undeafened during shuffle - returning to original channel ${currentVoiceChannel.name} (${currentVoiceChannel.id})`);
					await interaction.followUp({ 
						content: `🔊 <@${targetUserObj.id}> unmuted/undeafened during shuffle! Returning them to the original channel.` 
					});
					break;
				}
				
				// Pick a random voice channel (excluding current one)
				const availableChannels = accessibleVoiceChannels.filter(ch => ch.id !== targetUserObj.voice.channel?.id);
				if (availableChannels.length === 0) break;
				
				const randomChannel = availableChannels[Math.floor(Math.random() * availableChannels.length)];
				
				try {
					await targetUserObj.voice.setChannel(randomChannel);
					this.container.logger.debug(`Moved ${targetUserObj.displayName} (${targetUserObj.id}) to ${randomChannel.name} (${randomChannel.id})`);
				} catch (error) {
					this.container.logger.error(`Failed to move user ${targetUserObj.displayName} (${targetUserObj.id}) to ${randomChannel.name} (${randomChannel.id}):`, error);
					break;
				}
				
				// Wait before next move (except on last iteration)
				if (i < shuffleRounds - 1) {
					await new Promise(resolve => setTimeout(resolve, moveDelay));
				}
			}
			
			// Move back to original channel
			try {
				await targetUserObj.voice.setChannel(currentVoiceChannel);
				this.container.logger.info(`Returned ${targetUserObj.displayName} (${targetUserObj.id}) to ${currentVoiceChannel.name} (${currentVoiceChannel.id})`);
				
				// Send completion message based on whether shuffle was cancelled
				if (shuffleCancelled) {
					await interaction.followUp({ 
						content: `✅ <@${targetUserObj.id}> has been returned to ${currentVoiceChannel.name}. Hope they're awake now!` 
					});
				} else {
					await interaction.followUp({ 
						content: `✅ Finished shuffling <@${targetUserObj.id}>! They should be awake now.` 
					});
				}
			} catch (error) {
				this.container.logger.error(`Failed to return user ${targetUserObj.displayName} (${targetUserObj.id}) to original channel ${currentVoiceChannel.name} (${currentVoiceChannel.id}):`, error);
				await interaction.followUp({ 
					content: `⚠️ Shuffle completed but failed to return <@${targetUserObj.id}> to original channel.` 
				});
			}
		};
		
		// Start shuffling (don't await to avoid blocking)
		shuffleUser().catch(error => this.container.logger.error('Shuffle function error:', error));
		
		return; // Explicit return since we've already replied
	}
}
