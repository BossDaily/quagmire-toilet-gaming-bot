import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ApplicationCommandType } from 'discord.js';

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
		
		return interaction.reply({ 
			content: `✅ Ready to shuffle <@${targetUserObj.id}> from ${currentVoiceChannel.name}`,
		});
	}
}
