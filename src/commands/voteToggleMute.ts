import { ApplyOptions } from '@sapphire/decorators';
import { BucketScope, Command } from '@sapphire/framework';
import { Time } from '@sapphire/time-utilities';
import { ActionRowBuilder, ApplicationCommandType, ButtonBuilder, ButtonStyle, MessageActionRowComponentBuilder } from 'discord.js';

@ApplyOptions<Command.Options>({
	name: 'Vote To Toggle Mute',
	description: 'Initiates a vote to toggle mute a user in the voicechat',
	preconditions: ['voicecall'],
	cooldownDelay: Time.Second * 2,
	cooldownScope: BucketScope.Guild,
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
		const isMuted = member?.voice.serverMute;
		const muteString = isMuted ? 'unmute' : 'mute';

		const row = new ActionRowBuilder<MessageActionRowComponentBuilder>()
         .addComponents(
           new ButtonBuilder()
             .setCustomId('vote_up')
             .setLabel(`Vote to ${muteString}`)
             .setStyle(ButtonStyle.Success)
						 .setEmoji('👍'),
           new ButtonBuilder()
             .setCustomId('vote_down')
             .setLabel(`Vote to not ${muteString}`)
             .setStyle(ButtonStyle.Danger)
						 .setEmoji('👎')
         );
		

		await interaction.reply({ content: `You initiated a vote to ${muteString} <@${member?.user.id}>`, ephemeral:true });
		await voiceChannel?.send({	
			content: `${vcMemberString}`,
			components: [row]
		});
	}
}
