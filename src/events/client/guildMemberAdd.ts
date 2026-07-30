import { Events, type GuildMember } from "discord.js";
import db from "../../services/database.js";
import logger from "../../services/logger.js";
import type { Event } from "../../types/Event.js";

const event: Event<Events.GuildMemberAdd> = {
  name: Events.GuildMemberAdd,

  async execute(member: GuildMember): Promise<void> {
    const settings = await db.guildSettings.findUnique({
      where: { guildId: member.guild.id },
    });

    if (!settings) return;

    // 1. Production Hardened Auto-Role
    if (settings.autoRoleId) {
      try {
        const role = member.guild.roles.cache.get(settings.autoRoleId);
        const me = member.guild.members.me;

        if (role && me && role.position < me.roles.highest.position) {
          await member.roles.add(role, "Auto-role on join.");
        } else {
          logger.warn(`[AutoRole] Cannot assign role ${settings.autoRoleId} in ${member.guild.id}: Hierarchy issue.`);
        }
      } catch (error) {
        logger.error(`[AutoRole] Failed to assign role in ${member.guild.id}:`, error);
      }
    }

    // 2. Safe Welcome Message
    if (settings.welcomeChannelId && settings.welcomeMessage) {
      const channel = member.guild.channels.cache.get(settings.welcomeChannelId);

      if (channel?.isTextBased()) {
        const message = settings.welcomeMessage
          .replace(/{user}/g, `${member}`)
          .replace(/{server}/g, member.guild.name);

        await channel.send({
          content: message,
          allowedMentions: { parse: ["users"] } // Prevent bot from pinging @everyone via settings
        }).catch(() => {});
      }
    }
  },
};

export default event;