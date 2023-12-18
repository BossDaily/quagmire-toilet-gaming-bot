import { Precondition } from '@sapphire/framework';
import type { ContextMenuCommandInteraction } from 'discord.js';

export class UserPrecondition extends Precondition {
	public override async contextMenuRun(interaction: ContextMenuCommandInteraction) {
		if (!interaction.inGuild()) return this.error({ message: `You can't use this command in DMs` });
		const member = await interaction.guild?.members.fetch(interaction.targetId);
		const initiator = await interaction.guild?.members.fetch(interaction.user.id);
		if (!member?.voice?.channelId) return this.error({ message: `This user is not in a voice channel` });
		if (initiator?.voice.channelId !== member?.voice.channelId)
			return this.error({ message: `You are not in the same voice channel as this user` });
		if (member?.user.bot) return this.error({ message: `You can't mute bots` });
		return this.ok();
	}
}

declare module '@sapphire/framework' {
	interface Preconditions {
		voicecall: never;
	}
}
