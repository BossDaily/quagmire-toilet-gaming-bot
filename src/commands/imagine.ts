import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { Configuration, OpenAIApi,  } from 'openai';


const configuration = new Configuration({
	apiKey: process.env.OPEN_AI_TOKEN,
	basePath: 'https://api.pawan.krd/v1'
});

@ApplyOptions<Command.Options>({
	description: 'Generate an image from a text prompt'
})
export class UserCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName(this.name)
				.setDescription(this.description)
				.addStringOption((option) => option.setName('prompt').setDescription('prompt for the AI').setRequired(true))
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const openai = new OpenAIApi(configuration);
		
		await interaction.reply('Generating response')
		const userPrompt = interaction.options.getString('prompt');
		const res = await openai.createImage({
			prompt: userPrompt!,
			n: 1,
			size: '1024x1024',
		})
		console.log(res.data.data[0].b64_json)
		

		return await interaction.editReply({ content: res.data.data[0].url });
	}
}
