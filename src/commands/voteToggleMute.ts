import { ApplyOptions } from '@sapphire/decorators';
import { BucketScope, Command } from '@sapphire/framework';
import { Time } from '@sapphire/time-utilities';
import {
	ActionRowBuilder,
	ApplicationCommandType,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	EmbedBuilder,
	MessageActionRowComponentBuilder
} from 'discord.js';
import { VoteObject } from '../lib/utils';

@ApplyOptions<Command.Options>({
	name: 'Vote To Toggle Mute',
	description: 'Initiates a vote to toggle mute a user in the voicechat',
	preconditions: ['voicecall'],
	cooldownDelay: Time.Second * 2,
	cooldownScope: BucketScope.Guild
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
		const votes: VoteObject[] = [];

		const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
			new ButtonBuilder().setCustomId('vote_up').setLabel(`Vote to ${muteString}`).setStyle(ButtonStyle.Success).setEmoji('👍'),
			new ButtonBuilder().setCustomId('vote_down').setLabel(`Vote to not ${muteString}`).setStyle(ButtonStyle.Danger).setEmoji('👎')
		);

		const voteEmbed = new EmbedBuilder()
			.setColor('#2196f3')
			.setThumbnail(`${member?.user.displayAvatarURL()}`)
			.setTitle(`Vote to ${muteString} ${member?.user.displayName}`).setDescription(`<@${initiator?.user
			.id}> wants you to vote to mute <@${member?.user.id}> \n 
			### The vote will end <t:${Math.floor((Time.Second * 45) / 1000)}:R>`);

		await interaction.reply({ content: `You initiated a vote to ${muteString} <@${member?.user.id}>`, ephemeral: true });
		const msg = await voiceChannel?.send({
			content: `${vcMemberString}`,
			components: [row],
			embeds: [voteEmbed]
		});

		const collector = msg?.createMessageComponentCollector({ componentType: ComponentType.Button, time: Time.Second * 45 });
		collector?.on('collect', async (i) => {
			if (i.user.id != initiator?.user.id) {
				const vote = i.customId == 'vote_up' ? true : false;
				const voteObject: VoteObject = {
					user: await interaction.guild?.members.fetch(i.user.id),
					vote: vote
				};
				if (votes.some((vote) => vote.user?.user.id == voteObject.user?.user.id)) {
					votes.forEach((vote) => {
						if (vote.user?.user.id == voteObject.user?.user.id) {
							vote.vote = voteObject.vote;
						}
					});
				} else {
					votes.push(voteObject);
				}
				const yesVote = votes.filter((vote) => vote.vote == true);
				const noVote = votes.filter((vote) => vote.vote == false);
				const voteCountEmbed = new EmbedBuilder()
					.setColor('#2196f3')
					.setThumbnail(`${member?.user.displayAvatarURL()}`)
					.setTitle(`Vote to ${muteString} ${member?.user.displayName}`)
					.setDescription(
						`<@${initiator?.user.id}> wants you to vote to mute <@${member?.user.id}> \n 
					### The vote will end <t:${Math.floor((Time.Second * 45) / 1000)}:R>`
					)
					.addFields([
						{ name: 'Voted to mute', value: `${yesVote.map((v) => `<@${v.user?.user.id}>`).join('\n')}`, inline: true },
						{ name: 'Voted to not mute', value: `${noVote.map((v) => `<@${v.user?.user.id}>`).join('\n')}`, inline: true }
					])
					.setFooter({ text: `Vote to ${muteString} ${member?.user.displayName} | 👍: ${yesVote.length} 👎: ${noVote.length}` });

				await i.update({ embeds: [voteCountEmbed] });
			}
		});

		const disabledRow = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId('vote_up')
				.setLabel(`Vote to ${muteString}`)
				.setStyle(ButtonStyle.Success)
				.setEmoji('👍')
				.setDisabled(true),
			new ButtonBuilder()
				.setCustomId('vote_down')
				.setLabel(`Vote to not ${muteString}`)
				.setStyle(ButtonStyle.Danger)
				.setEmoji('👎')
				.setDisabled(true)
		);
		collector?.on('end', async () => {
			await msg?.edit({ components: [disabledRow] });

			const yesVote = votes.filter((vote) => vote.vote == true);
			const noVote = votes.filter((vote) => vote.vote == false);
			const embed = new EmbedBuilder()
				.setTitle('Vote Result')
				.setThumbnail(`${member?.user.displayAvatarURL()}`)
				.setColor('Green');

			if (yesVote.length > noVote.length) {
				if (isMuted) {
					await member?.voice.setMute(false);
					embed.setDescription(`<@${member?.user.id}> has been unmuted`);

					await msg?.reply({ embeds: [embed] });
				} else {
					await member?.voice.setMute(true);
					embed.setDescription(`<@${member?.user.id}> has been muted`);
					await msg?.reply({ embeds: [embed] });
				}
			} else {
				embed.setDescription(`The vote to ${muteString} <@${member?.user.id}> has failed`).setColor('Yellow');
				await msg?.reply({ embeds: [embed] });
			}
		});
	}
}
