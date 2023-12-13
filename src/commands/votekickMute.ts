import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ApplicationCommandType } from 'discord.js';

@ApplyOptions<Command.Options>({
	name: 'Vote to Mute',
	description: 'Initiates a vote to mute the user in all voice chats',
	preconditions: ['voicecall'],
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
		const member = await interaction.guild?.members.fetch(interaction.targetId);
		const initiator = await interaction.guild?.members.fetch(interaction.user.id);
    
		return interaction.reply({ content: `Yo <@${member?.id}> <@${initiator?.id} wants you to shut up` });
	}
}
