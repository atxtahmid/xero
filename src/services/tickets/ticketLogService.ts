import {
  ColorResolvable,
  EmbedBuilder,
  Guild,
  TextChannel,
  User,
} from "discord.js";

import logger from "../../logger/logger.js";
import ticketService from "./ticketService.js";

class TicketLogService {
  private static readonly FOOTER = "Xero Ticket System";

  private async resolveLogChannel(
    guild: Guild,
    ticketChannelId: string,
  ): Promise<TextChannel | null> {
    try {
      const ticket = await ticketService.getByChannel(ticketChannelId);

      if (!ticket || !ticket.panel.logChannelId) {
        return null;
      }

      const logChannel = await guild.channels
        .fetch(ticket.panel.logChannelId)
        .catch(() => null);

      if (!(logChannel instanceof TextChannel)) {
        logger.warn(
          `[TicketLog] Invalid log channel for ticket ${ticketChannelId}.`,
        );

        return null;
      }

      return logChannel;
    } catch (error) {
      logger.error(
        `[TicketLog] Failed to resolve log channel for ${ticketChannelId}:`,
        error,
      );

      return null;
    }
  }

  private async send(
    guild: Guild,
    ticketChannelId: string,
    embed: EmbedBuilder,
  ): Promise<void> {
    const channel = await this.resolveLogChannel(
      guild,
      ticketChannelId,
    );

    if (!channel) {
      return;
    }

    try {
      await channel.send({
        embeds: [embed],
      });
    } catch (error) {
      logger.error(
        `[TicketLog] Failed to send log to ${channel.id}:`,
        error,
      );
    }
  }

  private buildBaseEmbed(
    color: ColorResolvable,
    title: string,
    ticketChannelId: string,
    user: User,
    staff?: User,
  ): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`LOG: ${title}`)
      .addFields(
        {
          name: "Ticket",
          value: `<#${ticketChannelId}> (\`${ticketChannelId}\`)`,
        },
        {
          name: "User",
          value: `${user.tag} (\`${user.id}\`)`,
          inline: true,
        },
      )
      .setFooter({
        text: TicketLogService.FOOTER,
      })
      .setTimestamp();

    if (staff) {
      embed.addFields({
        name: "Staff",
        value: `${staff.tag} (\`${staff.id}\`)`,
        inline: true,
      });
    }

    return embed;
  }

  private async log(
    guild: Guild,
    channelId: string,
    color: ColorResolvable,
    title: string,
    user: User,
    staff?: User,
  ): Promise<void> {
    const embed = this.buildBaseEmbed(
      color,
      title,
      channelId,
      user,
      staff,
    );

    await this.send(guild, channelId, embed);
  }

  async logCreate(
    guild: Guild,
    channelId: string,
    user: User,
  ) {
    await this.log(
      guild,
      channelId,
      0x57f287,
      "Ticket Created",
      user,
    );
  }

  async logClaim(
    guild: Guild,
    channelId: string,
    user: User,
    staff: User,
  ) {
    await this.log(
      guild,
      channelId,
      0x5865f2,
      "Ticket Claimed",
      user,
      staff,
    );
  }

  async logUnclaim(
    guild: Guild,
    channelId: string,
    user: User,
    staff: User,
  ) {
    await this.log(
      guild,
      channelId,
      0xfaa61a,
      "Ticket Unclaimed",
      user,
      staff,
    );
  }

  async logLock(
    guild: Guild,
    channelId: string,
    user: User,
    staff: User,
  ) {
    await this.log(
      guild,
      channelId,
      0xed4245,
      "Ticket Locked",
      user,
      staff,
    );
  }

  async logUnlock(
    guild: Guild,
    channelId: string,
    user: User,
    staff: User,
  ) {
    await this.log(
      guild,
      channelId,
      0x57f287,
      "Ticket Unlocked",
      user,
      staff,
    );
  }

  async logClose(
    guild: Guild,
    channelId: string,
    user: User,
    staff: User,
  ) {
    await this.log(
      guild,
      channelId,
      0xed4245,
      "Ticket Closed",
      user,
      staff,
    );
  }

  async logDelete(
    guild: Guild,
    channelId: string,
    user: User,
    staff: User,
  ) {
    await this.log(
      guild,
      channelId,
      0x2f3136,
      "Ticket Deleted",
      user,
      staff,
    );
  }

  async logReopen(
    guild: Guild,
    channelId: string,
    user: User,
    staff: User,
  ) {
    await this.log(
      guild,
      channelId,
      0x57f287,
      "Ticket Reopened",
      user,
      staff,
    );
  }
}

export default new TicketLogService();