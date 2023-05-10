import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';

@ApplyOptions<Command.Options>({
	description: 'Search the internet with AI'
})
export class UserCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName(this.name)
				.setDescription(this.description)
				.addStringOption((option) => option.setName('question').setDescription('question you want to ask me').setRequired(true))
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		await interaction.reply('Generating response')
		const prompt = interaction.options.getString('question');
		const promptEncoded = encodeURIComponent(prompt!);
		const url = `${process.env.GPT_URL}ask?model=you&prompt=`;

		const promptGpt = await fetch(`${url}${promptEncoded}`);
		const res = await promptGpt.text()
		

		return interaction.editReply({ content: res });
	}
}
