import { Precondition } from '@sapphire/framework';
import type { ContextMenuCommandInteraction } from 'discord.js';

export class UserPrecondition extends Precondition {
	public override async contextMenuRun(interaction: ContextMenuCommandInteraction) {
		if (!interaction.inGuild()) return this.error({ message: `You can't use this command in DMs` });
		const member = await interaction.guild?.members.fetch(interaction.targetId);
		const initiator = await interaction.guild?.members.fetch(interaction.user.id);
		if(member?.user.id == "274973338676494347") return this.error({ message: `https://c.tenor.com/0PqYCdwhHDQAAAAM/discord.gif` });
		if (!member?.voice?.channelId) return this.error({ message: `You are not in a voice channel` });
		if(member?.user.id == initiator?.user.id) return this.error({ message: `You can't use this command on yourself` });
		if (member?.user.bot) return this.error({ message: `You can't use this command on a bot` });
		if (!member?.voice?.channelId) return this.error({ message: `This user is not in a voice channel` });
		if (initiator?.voice.channelId !== member?.voice.channelId)
			return this.error({ message: `You are not in the same voice channel as this user` });
		
		return this.ok();
	}
}

declare module '@sapphire/framework' {
	interface Preconditions {
		voicecall: never;
	}
}
