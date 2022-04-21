
import { Message, MessageEmbed, Presence } from 'discord.js';

import CommandSource from '../../structures/commands/CommandSource';
import { Colors, Symbols } from '../../utils/Constants';
import { sendTemporal, canMemberExecute, getMessageOptions } from '../../utils/DiscordUtils';
import { getCommandName } from '../../utils/CommandUtils';
import Event from '../../structures/Event';
import MessageArgumentsParser from '../../MessageArgumentsParser';
import { split } from '../../utils/StringUtils';

export default class GameChecker extends Event {
    override async run(oldPresence: Presence, newPresence: Presence){
        const gameName = newPresence.activities

        console.log(gameName)
        
    }
}