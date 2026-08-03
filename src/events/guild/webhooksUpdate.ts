import {
  Events,
  TextChannel,
  VoiceChannel,
  ForumChannel,
  NewsChannel,
  StageChannel,
} from "discord.js";

import antiNukeHelper from "../../utils/antiNukeHelper.js";
import { AntiNukeAction } from "../../utils/antiNukeActions.js";
import serverLogService from "../../services/serverLogService.js";

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