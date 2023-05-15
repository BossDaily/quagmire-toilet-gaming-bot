import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import type { Presence } from 'discord.js';

@ApplyOptions<Listener.Options>({ event: Events.PresenceUpdate })
export class UserEvent extends Listener<typeof Events.PresenceUpdate> {
	public override async run(presence: Presence) {
		
	}
}
