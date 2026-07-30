import {
  EmbedBuilder,
  Guild,
  TextChannel,
  User,
  ColorResolvable,
} from "discord.js";

import ticketService from "./ticketService.js";

class TicketLogService {
  private async resolveLogChannel(
    guild: Guild,
    ticketChannelId: string,
  ): Promise<TextChannel | null> {
    try {
      const ticket = await ticketService.getByChannel(ticketChannelId);
      if (!ticket || !ticket.panel.logChannelId) return null;

      const logChannel = await guild.channels.fetch(ticket.panel.logChannelId).catch(() => null);
      
      if (logChannel instanceof TextChannel) {
        return logChannel;
      }
      return null;
    } catch (error) {
      console.error("[TicketLog] Error resolving log channel:", error);
      return null;
    }
  }

  private async send(
    guild: Guild,
    ticketChannelId: string,
    embed: EmbedBuilder
  ): Promise<void> {
    const channel = await this.resolveLogChannel(guild, ticketChannelId);
    if (!channel) return;

    try {
      await channel.send({ embeds: [embed] });
    } catch (error) {
      console.error(`[TicketLog] Failed to send log to ${channel.id}:`, error);
    }
  }

  private buildBaseEmbed(
    color: ColorResolvable,
    title: string,
    ticketChannelId: string,
    user: User,
    staff?: User
  ): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`LOG: ${title}`)
      .addFields(
        { name: "Ticket", value: `<#${ticketChannelId}> (\`${ticketChannelId}\`)`, inline: false },
        { name: "User", value: `${user.tag} (\`${user.id}\`)`, inline: true }
      )
      .setTimestamp();

    if (staff) {
      embed.addFields({ name: "Staff", value: `${staff.tag} (\`${staff.id}\`)`, inline: true });
    }

    return embed;
  }

  async logCreate(guild: Guild, channelId: string, user: User) {
    const embed = this.buildBaseEmbed(0x57F287, "Ticket Created", channelId, user);
    await this.send(guild, channelId, embed);
  }

  async logClaim(guild: Guild, channelId: string, user: User, staff: User) {
    const embed = this.buildBaseEmbed(0x5865F2, "Ticket Claimed", channelId, user, staff);
    await this.send(guild, channelId, embed);
  }

  async logUnclaim(guild: Guild, channelId: string, user: User, staff: User) {
    const embed = this.buildBaseEmbed(0xFAA61A, "Ticket Unclaimed", channelId, user, staff);
    await this.send(guild, channelId, embed);
  }

  async logLock(guild: Guild, channelId: string, user: User, staff: User) {
    const embed = this.buildBaseEmbed(0xED4245, "Ticket Locked", channelId, user, staff);
    await this.send(guild, channelId, embed);
  }

  async logUnlock(guild: Guild, channelId: string, user: User, staff: User) {
    const embed = this.buildBaseEmbed(0x57F287, "Ticket Unlocked", channelId, user, staff);
    await this.send(guild, channelId, embed);
  }

  async logClose(guild: Guild, channelId: string, user: User, staff: User) {
    const embed = this.buildBaseEmbed(0xED4245, "Ticket Closed", channelId, user, staff);
    await this.send(guild, channelId, embed);
  }

  async logDelete(guild: Guild, channelId: string, user: User, staff: User) {
    const embed = this.buildBaseEmbed(0x2F3136, "Ticket Deleted", channelId, user, staff);
    await this.send(guild, channelId, embed);
  }
}

export default new TicketLogService();