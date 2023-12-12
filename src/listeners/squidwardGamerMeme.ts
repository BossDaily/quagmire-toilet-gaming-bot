/* import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { AttachmentBuilder, Presence } from 'discord.js';
import puppeteer from 'puppeteer';

@ApplyOptions<Listener.Options>({ event: Events.PresenceUpdate })
export class UserEvent extends Listener<typeof Events.PresenceUpdate> {
	public override async run(oldPresence: Presence, newPresence: Presence) {
		const badGames = ['Fortnite', 'Genshin Impact', 'Overwatch', 'Valorant', 'League Of Legends', 'Apex Legends', 'GitHub'];
		const guild = newPresence.guild

		if (
			newPresence.activities.some((activ) => badGames.includes(`${activ.name}`)) &&
			!oldPresence.activities.some((activ) => badGames.includes(`${activ.name}`)) &&
			guild?.id === '765801416680931328'
		) {
			const game = newPresence.activities.filter((activ) => badGames.includes(`${activ.name}`));
			const channel = await guild.channels.fetch('765801416680931331')

			const browser = await puppeteer.launch({headless: true});
			const page = await browser.newPage();
			await page.setContent(`<html><body class=""><div class="flex justify-center items-center h-screen relative text-white font-bold text-8xl">
			 <img src="https://media.discordapp.net/attachments/1105620465403302000/1107662081475498064/6exa47.png" height="1024" width="1024" class="justify-center" />
			 <h1 class="top-1/2 left-1/6 absolute">${game[0]} Player</h1>
		 </div></body></html>`);
			const div = await page.$('div');
			const screenshot = await div?.screenshot();
			await browser.close();

			const attachment = new AttachmentBuilder(screenshot!)

			if(channel?.isTextBased()){
				channel.send({content: `<@${newPresence.user?.id}>`, files: [attachment]})
			}
			
		}
	}
}
 */