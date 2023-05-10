import { ApplyOptions } from '@sapphire/decorators';
import { Events } from '@sapphire/framework';
import { Listener } from '@sapphire/framework';
import type { Message } from 'discord.js';

@ApplyOptions<Listener.Options>({ event: Events.MessageCreate })
export class UserEvent extends Listener<typeof Events.MessageCreate> {
	public async run(message: Message) {
		const client = this.container.client;

		if (message.content.includes(`<@${client.user?.id}>`)) {
			const prompt = `You are talking to ${
				message.author.username
			}, here is what they said: "${message.content.replaceAll(`<@${client.user?.id}>`, '')}"`;
			const promptEncoded = encodeURIComponent(prompt!);
			const url = `${process.env.GPT_URL}ask?model=you&prompt=`;
			await message.channel.sendTyping()
			const promptGpt = await fetch(`${url}${promptEncoded}`).then();
			
			const res = await promptGpt.text();
			
			await message.reply(res);
		}
	}
}
