import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ApplicationCommandType, ChannelType, type VoiceChannel } from 'discord.js';

@ApplyOptions<Command.Options>({
	description: 'This command shuffles the user around several voice channels to get their attention.',
	name: 'VC Shuffle',
	//cooldownDelay: 1000,
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
		console.log(targetVoiceState)
		
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
			
			for (let i = 0; i < shuffleRounds; i++) {
				// Pick a random voice channel (excluding current one)
				const availableChannels = accessibleVoiceChannels.filter(ch => ch.id !== targetUserObj.voice.channel?.id);
				if (availableChannels.length === 0) break;
				
				const randomChannel = availableChannels[Math.floor(Math.random() * availableChannels.length)];
				
				try {
					await targetUserObj.voice.setChannel(randomChannel);
					console.log(`Moved ${targetUserObj.displayName} to ${randomChannel.name}`);
				} catch (error) {
					console.error(`Failed to move user: ${error}`);
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
				console.log(`Returned ${targetUserObj.displayName} to ${currentVoiceChannel.name}`);
				
				// Send completion message
				await interaction.followUp({ 
					content: `✅ Finished shuffling <@${targetUserObj.id}>! They should be awake now.` 
				});
			} catch (error) {
				console.error(`Failed to return user to original channel: ${error}`);
				await interaction.followUp({ 
					content: `⚠️ Shuffle completed but failed to return <@${targetUserObj.id}> to original channel.` 
				});
			}
		};
		
		// Start shuffling (don't await to avoid blocking)
		shuffleUser().catch(console.error);
		
		return; // Explicit return since we've already replied
	}
}
