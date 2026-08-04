import {
  Events,
  TextChannel,
  VoiceChannel,
  ForumChannel,
  NewsChannel,
  StageChannel,
} from "discord.js";

import antiNukeHelper from "../../services/antinuke/antiNukeHelper.js";
import { AntiNukeAction } from "../../constants/antiNukeActions.js";
import serverLogService from "../../services/logging/serverLogService.js";

export default {
  name: Events.WebhooksUpdate,

  async execute(
    channel:
      | TextChannel
      | VoiceChannel
      | ForumChannel
      | NewsChannel
      | StageChannel,
  ): Promise<void> {
    await antiNukeHelper.handle(
      channel.guild,
      AntiNukeAction.WEBHOOK_CREATE,
    );

    await serverLogService.logWebhookUpdate(channel.guild, channel.id);
  },
};