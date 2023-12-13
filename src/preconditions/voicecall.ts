import { Precondition } from '@sapphire/framework';
import type { ChatInputCommandInteraction, ContextMenuCommandInteraction, Message } from 'discord.js';

export class UserPrecondition extends Precondition {
	public override messageRun(message: Message) {
		return this.ok();
	}

	public override chatInputRun(interaction: ChatInputCommandInteraction) {
		return this.ok();
	}

	public override async contextMenuRun(interaction: ContextMenuCommandInteraction) {
		if (!interaction.inGuild()) return this.error({ message: `You can't use this command in DMs` });
		const member = await interaction.guild?.members.fetch(interaction.targetId);
		const initiator = await interaction.guild?.members.fetch(interaction.user.id);
		if (!member?.voice) return this.error({ message: `This user is not in a voice channel` });
		if (initiator?.voice.channelId !== member?.voice.channelId)
			return this.error({ message: `You are not in the same voice channel as this user` });
		if (member?.voice.serverMute) return this.error({ message: `This user is already muted` });
		return this.ok();
	}
}

declare module '@sapphire/framework' {
	interface Preconditions {
		voicecall: never;
	}
}
