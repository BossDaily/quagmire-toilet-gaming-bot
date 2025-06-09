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
		
		// Get the target user as a guild member to access voice state
		const targetMember = interaction.guild?.members.fetch(interaction.targetId);
		
		if (!targetMember) {
			return interaction.reply({ 
				content: '❌ Could not find the target user in this server.', 
				ephemeral: true 
			});
		}
		
		// Check if the target user is in a voice channel
		const voiceChannel = (await targetMember).voice?.channel
		
		if (!voiceChannel) {
			return interaction.reply({ 
				content: `❌ ${(await targetMember).displayName} is not currently in a voice channel.`, 
				ephemeral: true 
			});
		}
		
		// Store the target user and their current voice channel
		const targetUserObj = targetMember;
		const currentVoiceChannel = voiceChannel;
		
		return interaction.reply({ 
			content: `✅ Ready to shuffle ${(await targetUserObj).displayName} from ${currentVoiceChannel.name}`, 
			ephemeral: true
		});
	}
}
