import {
  Activity,
  Message,
  MessageEmbed,
  Presence,
  TextChannel,
} from "discord.js";

import CommandSource from "../../structures/commands/CommandSource";
import { Colors, Symbols } from "../../utils/Constants";
import {
  sendTemporal,
  canMemberExecute,
  getMessageOptions,
} from "../../utils/DiscordUtils";
import { getCommandName } from "../../utils/CommandUtils";
import Event from "../../structures/Event";
import MessageArgumentsParser from "../../MessageArgumentsParser";
import { split } from "../../utils/StringUtils";
import { SquidWard } from "../../utils/Squidward";

export default class GameChecker extends Event {
  override async run(msg: Message) {
      
  }
}
