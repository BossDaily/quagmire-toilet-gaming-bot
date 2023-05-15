import { ApplyOptions } from '@sapphire/decorators';
import { Events } from '@sapphire/framework';
import { Listener } from '@sapphire/framework';
import type { Message } from 'discord.js';
import { Configuration, OpenAIApi } from 'openai';

const configuration = new Configuration({
	apiKey: process.env.OPEN_AI_TOKEN,
	basePath: 'https://api.pawan.krd/v1'
});

@ApplyOptions<Listener.Options>({ event: Events.MessageCreate })
export class UserEvent extends Listener<typeof Events.MessageCreate> {
	public async run(message: Message) {
		const client = this.container.client;

		if (message.content.includes(`<@${client.user?.id}>`)) {
			const prompt = `You are a chatbot called ${client.user?.username}, you are in a Discord server called ${
				message.guild?.name
			}. You are talking to ${message.author.username}, here is what they said: "${message.content.replaceAll(`<@${client.user?.id}>`, '')}"`;
			/* const promptEncoded = encodeURIComponent(prompt!);
			const url = `${process.env.GPT_URL}ask?model=you&prompt=`;
			await message.channel.sendTyping()
			const promptGpt = await fetch(`${url}${promptEncoded}`).then();
			
			const res = await promptGpt.text(); */

			const openai = new OpenAIApi(configuration);

			const res = await openai.createCompletion({
				model: 'gpt-4',
				prompt: prompt,
				temperature: 0.7,
				max_tokens: 256,
				top_p: 1,
				frequency_penalty: 0,
				presence_penalty: 0,
				stop: ['Human: ', 'AI: ']
			});

			await message.reply(res.data.choices[0]?.text!);
		}
	}
}
