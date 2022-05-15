import {
  Activity,
  DMChannel,
  Message,
  MessageEmbed,
  NewsChannel,
  PartialDMChannel,
  Presence,
  TextChannel,
  ThreadChannel,
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
    const embed = new MessageEmbed()
      .setColor("#0099ff")
      .setTitle(msg.author.tag)
      .setDescription(msg.content)
      .setThumbnail(msg.author.displayAvatarURL());
    const channel = await msg.guild?.channels.fetch(msg.channel.id);

    if (
      channel?.parentId === "975503117904924673" &&
      msg.guildId === "765801416680931328"
    ) {
      const sendChannel = await msg.guild?.channels
        .fetch("972146944354947124")
        .then((channel) => {
          if (channel?.type === "GUILD_NEWS") {
            channel.send({ embeds: [embed] });
          }
        });
    }
  }
}
