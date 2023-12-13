import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ApplicationCommandType } from 'discord.js';

@ApplyOptions<Command.Options>({
	name: 'Vote to Mute',
	description: 'Initiates a vote to mute the user in all voice chats'
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
		if (!interaction.inGuild()) return interaction.reply({ content: `You can't use this command in DMs` });
		const member = await interaction.guild?.members.fetch(interaction.targetId);
		return interaction.reply({ content: `Why do you want to mute <@${member?.id}>` });
	}
}
