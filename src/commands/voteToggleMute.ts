import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ApplicationCommandType } from 'discord.js';

@ApplyOptions<Command.Options>({
	name: 'Vote To Toggle Mute',
	description: 'Initiates a vote to toggle mute a user in the voicechat',
	preconditions: ['voicecall']
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
		const voiceChannel = await member?.voice.channel?.fetch();
		const voiceChannelMembers = voiceChannel?.members;
		const vcMemberString = voiceChannelMembers
			?.map((vcMember) => {
				if (!vcMember?.user.bot && vcMember?.user.id != member?.user.id) {
					return `<@${vcMember.user.id}>`;
				} else {
					return '';
				}
			})
			.join(', ');

		return interaction.reply({ content: `Yo <@${member?.id}>${vcMemberString} wants you to shut up (<@${initiator?.user.id}> started it)\n` });
	}
}
