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
  override async run(oldPresence: Presence, newPresence: Presence) {
    const newGames: Activity[] = newPresence.activities;
    const oldGames: Activity[] = oldPresence.activities;

    let oldGameList: string = "";
    oldGameList = Object.values(oldGames)
      .map((game) => game.name)
      .join(", ");

    let newGameList: string = "";
    newGameList = Object.values(newGames)
      .map((game) => game.name)
      .join(", ");

    const userPing: string = `<@${newPresence.user?.id.toString()}>`;

    const channelSend = newPresence.guild?.systemChannel;

    if (newGameList != oldGameList) {
      newGames.forEach((e) => {
        if (
          ["Fortnite", "VALORANT", "osu!", "Visual Studio Code"].includes(
            e.name
          )
        ) {
          SquidWard(e.name, channelSend, userPing);
        }
      });
    }
  }
}
/*
[
    Activity {
      id: 'custom',
      name: 'Custom Status',
      type: 'CUSTOM',
      url: null,
      details: null,
      state: null,
      applicationId: null,
      timestamps: null,
      syncId: null,
      platform: null,
      party: null,
      assets: null,
      flags: ActivityFlags { bitfield: 0 },
      emoji: Emoji { animated: null, name: '🤑', id: undefined },
      sessionId: null,
      buttons: [],
      createdTimestamp: 1650505288279
    },
    Activity {
      id: 'spotify:1',
      name: 'Spotify',
      type: 'LISTENING',
      url: null,
      details: 'Diamonds From Sierra Leone - Remix',
      state: 'Kanye West; JAY-Z',
      applicationId: null,
      timestamps: { start: 2022-04-21T01:40:52.762Z, end: 2022-04-21T01:44:46.162Z },
      syncId: '34KUIBsIUiPV7oCIzSdDAU',
      platform: null,
      party: { id: 'spotify:274973338676494347' },
      assets: RichPresenceAssets {
        largeText: 'Late Registration',
        smallText: null,
        largeImage: 'spotify:ab67616d0000b273428d2255141c2119409a31b2',
        smallImage: null
      },
      flags: ActivityFlags { bitfield: 48 },
      emoji: null,
      sessionId: 'dc0654fdb01e38a56193732134936291',
      buttons: [],
      createdTimestamp: 1650505273867
    },
    Activity {
      id: '4849fdac08fab24d',
      name: 'Visual Studio Code',
      type: 'PLAYING',
      url: null,
      details: 'Editing index.ts',
      state: 'Workspace: Typescript',
      applicationId: '383226320970055681',
      timestamps: { start: 2022-04-20T22:24:09.688Z, end: null },
      syncId: null,
      platform: null,
      party: null,
      assets: RichPresenceAssets {
        largeText: 'Editing a TYPESCRIPT file',
        smallText: 'Visual Studio Code',
        largeImage: '808842276184784916',
        smallImage: '565945770067623946'
      },
      flags: ActivityFlags { bitfield: 0 },
      emoji: null,
      sessionId: null,
      buttons: [],
      createdTimestamp: 1650505097131
    }
  ]
  */
