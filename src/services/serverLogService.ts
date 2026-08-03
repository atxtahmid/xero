import {
  ChannelType,
  EmbedBuilder,
  Guild,
  GuildBasedChannel,
  GuildChannel,
  GuildEmoji,
  GuildMember,
  Invite,
  PermissionFlagsBits,
  Role,
  Sticker,
  TextChannel,
  User,
  VoiceState,
} from "discord.js";

import db from "./database.js";
import logger from "./logger.js";

const MESSAGE_PREVIEW_LIMIT = 1024;

/**
 * channelCreate.ts/channelUpdate.ts type their param as GuildChannel;
 * channelDelete.ts types its param as GuildBasedChannel (which also
 * covers thread channels, a separate class hierarchy from GuildChannel).
 * Neither type alone covers every call site, so the channel-logging
 * methods below accept this union instead.
 */
type LoggableChannel = GuildChannel | GuildBasedChannel;

async function resolveLogChannel(
  guild: Guild,
): Promise<TextChannel | null> {
  const settings = await db.guildSettings.findUnique({
    where: { guildId: guild.id },
    select: { serverLogChannelId: true },
  });

  if (!settings?.serverLogChannelId) {
    return null;
  }

  const channel = await guild.channels
    .fetch(settings.serverLogChannelId)
    .catch(() => null);

  if (!(channel instanceof TextChannel)) {
    return null;
  }

  const me = guild.members.me;

  if (
    !me ||
    !channel.permissionsFor(me)?.has([
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.EmbedLinks,
    ])
  ) {
    return null;
  }

  return channel;
}

function truncate(content: string, limit: number): string {
  if (content.length <= limit) {
    return content;
  }

  return `${content.slice(0, limit - 1)}…`;
}

function channelTypeLabel(type: ChannelType): string {
  switch (type) {
    case ChannelType.GuildText:
      return "Text";
    case ChannelType.GuildVoice:
      return "Voice";
    case ChannelType.GuildCategory:
      return "Category";
    case ChannelType.GuildAnnouncement:
      return "Announcement";
    case ChannelType.GuildForum:
      return "Forum";
    case ChannelType.GuildStageVoice:
      return "Stage";
    case ChannelType.PublicThread:
      return "Public Thread";
    case ChannelType.PrivateThread:
      return "Private Thread";
    case ChannelType.AnnouncementThread:
      return "Announcement Thread";
    case ChannelType.GuildMedia:
      return "Media";
    default:
      return "Channel";
  }
}

/** Renders a list of {label, before, after} changes as embed fields, skipping anything unchanged. */
function diffFields(
  changes: Array<{ label: string; before: unknown; after: unknown }>,
): { name: string; value: string }[] {
  return changes
    .filter((c) => c.before !== c.after)
    .map((c) => ({
      name: c.label,
      value: `${c.before ?? "*none*"} → ${c.after ?? "*none*"}`,
    }));
}

class ServerLogService {
  async logMessageDelete(
    guild: Guild,
    channelId: string,
    author: User,
    content: string,
    attachmentUrls: string[],
  ): Promise<void> {
    try {
      const channel = await resolveLogChannel(guild);

      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("🗑️ Message Deleted")
        .setThumbnail(author.displayAvatarURL())
        .addFields(
          {
            name: "👤 Author",
            value: `${author.tag}\n(\`${author.id}\`)`,
            inline: true,
          },
          {
            name: "📍 Channel",
            value: `<#${channelId}>`,
            inline: true,
          },
        )
        .setTimestamp();

      embed.addFields({
        name: "💬 Content",
        value: content
          ? truncate(content, MESSAGE_PREVIEW_LIMIT)
          : "*No text content.*",
      });

      if (attachmentUrls.length > 0) {
        embed.addFields({
          name: `📎 Attachments (${attachmentUrls.length})`,
          value: truncate(attachmentUrls.join("\n"), MESSAGE_PREVIEW_LIMIT),
        });
      }

      await channel.send({ embeds: [embed] });
    } catch (error) {
      logger.error("[ServerLog] Failed to log message delete:", error);
    }
  }

  async logMessageEdit(
    guild: Guild,
    channelId: string,
    author: User,
    oldContent: string,
    newContent: string,
    messageUrl: string,
  ): Promise<void> {
    try {
      const channel = await resolveLogChannel(guild);

      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor(0xfee75c)
        .setTitle("✏️ Message Edited")
        .setThumbnail(author.displayAvatarURL())
        .addFields(
          {
            name: "👤 Author",
            value: `${author.tag}\n(\`${author.id}\`)`,
            inline: true,
          },
          {
            name: "📍 Channel",
            value: `<#${channelId}>`,
            inline: true,
          },
          {
            name: "🔗 Jump to Message",
            value: `[Click here](${messageUrl})`,
            inline: true,
          },
          {
            name: "Before",
            value: oldContent
              ? truncate(oldContent, MESSAGE_PREVIEW_LIMIT)
              : "*No text content.*",
          },
          {
            name: "After",
            value: newContent
              ? truncate(newContent, MESSAGE_PREVIEW_LIMIT)
              : "*No text content.*",
          },
        )
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } catch (error) {
      logger.error("[ServerLog] Failed to log message edit:", error);
    }
  }

  async logMemberJoin(guild: Guild, member: GuildMember): Promise<void> {
    try {
      const channel = await resolveLogChannel(guild);

      if (!channel) return;

      const accountAgeDays = Math.floor(
        (Date.now() - member.user.createdTimestamp) / 86_400_000,
      );

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("📥 Member Joined")
        .setThumbnail(member.user.displayAvatarURL())
        .addFields(
          {
            name: "👤 Member",
            value: `${member.user.tag}\n(\`${member.id}\`)`,
            inline: true,
          },
          {
            name: "📅 Account Created",
            value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>${
              accountAgeDays < 7 ? " ⚠️ New account" : ""
            }`,
            inline: true,
          },
          {
            name: "👥 Member Count",
            value: `${guild.memberCount}`,
            inline: true,
          },
        )
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } catch (error) {
      logger.error("[ServerLog] Failed to log member join:", error);
    }
  }

  async logMemberLeave(
    guild: Guild,
    member: GuildMember,
  ): Promise<void> {
    try {
      const channel = await resolveLogChannel(guild);

      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("📤 Member Left")
        .setThumbnail(member.user.displayAvatarURL())
        .addFields(
          {
            name: "👤 Member",
            value: `${member.user.tag}\n(\`${member.id}\`)`,
            inline: true,
          },
          {
            name: "👥 Member Count",
            value: `${guild.memberCount}`,
            inline: true,
          },
        )
        .setTimestamp();

      if (member.joinedTimestamp) {
        embed.addFields({
          name: "📅 Joined Server",
          value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`,
          inline: true,
        });
      }

      await channel.send({ embeds: [embed] });
    } catch (error) {
      logger.error("[ServerLog] Failed to log member leave:", error);
    }
  }
  async logCommandUsage(
    guild: Guild,
    channelId: string,
    user: User,
    commandName: string,
    options: string,
  ): Promise<void> {
    try {
      const channel = await resolveLogChannel(guild);

      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("⌨️ Command Used")
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          {
            name: "👤 User",
            value: `${user.tag}\n(\`${user.id}\`)`,
            inline: true,
          },
          {
            name: "📍 Channel",
            value: `<#${channelId}>`,
            inline: true,
          },
          {
            name: "🔧 Command",
            value: `\`/${commandName}${options ? ` ${options}` : ""}\``,
          },
        )
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } catch (error) {
      logger.error("[ServerLog] Failed to log command usage:", error);
    }
  }

  async logChannelCreate(
    guild: Guild,
    createdChannel: LoggableChannel,
  ): Promise<void> {
    try {
      const channel = await resolveLogChannel(guild);

      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("📁 Channel Created")
        .addFields(
          {
            name: "📍 Channel",
            value: `${createdChannel.name} (\`${createdChannel.id}\`)`,
            inline: true,
          },
          {
            name: "🏷️ Type",
            value: channelTypeLabel(createdChannel.type),
            inline: true,
          },
        )
        .setTimestamp();

      if (createdChannel.parent) {
        embed.addFields({
          name: "📂 Category",
          value: createdChannel.parent.name,
          inline: true,
        });
      }

      await channel.send({ embeds: [embed] });
    } catch (error) {
      logger.error("[ServerLog] Failed to log channel create:", error);
    }
  }

  async logChannelDelete(
    guild: Guild,
    deletedChannel: LoggableChannel,
  ): Promise<void> {
    try {
      const channel = await resolveLogChannel(guild);

      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("🗑️ Channel Deleted")
        .addFields(
          {
            name: "📍 Channel",
            value: `${deletedChannel.name} (\`${deletedChannel.id}\`)`,
            inline: true,
          },
          {
            name: "🏷️ Type",
            value: channelTypeLabel(deletedChannel.type),
            inline: true,
          },
        )
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } catch (error) {
      logger.error("[ServerLog] Failed to log channel delete:", error);
    }
  }

  async logChannelUpdate(
    guild: Guild,
    oldChannel: LoggableChannel,
    newChannel: LoggableChannel,
  ): Promise<void> {
    try {
      const channel = await resolveLogChannel(guild);

      if (!channel) return;

      const oldTopic =
        "topic" in oldChannel ? (oldChannel.topic ?? null) : null;
      const newTopic =
        "topic" in newChannel ? (newChannel.topic ?? null) : null;
      const oldNsfw = "nsfw" in oldChannel ? oldChannel.nsfw : false;
      const newNsfw = "nsfw" in newChannel ? newChannel.nsfw : false;
      const oldSlowmode =
        "rateLimitPerUser" in oldChannel
          ? (oldChannel.rateLimitPerUser ?? 0)
          : 0;
      const newSlowmode =
        "rateLimitPerUser" in newChannel
          ? (newChannel.rateLimitPerUser ?? 0)
          : 0;

      const changes = diffFields([
        { label: "📛 Name", before: oldChannel.name, after: newChannel.name },
        { label: "📝 Topic", before: oldTopic, after: newTopic },
        { label: "🔞 NSFW", before: oldNsfw, after: newNsfw },
        {
          label: "🐌 Slowmode",
          before: `${oldSlowmode}s`,
          after: `${newSlowmode}s`,
        },
        {
          label: "📂 Category",
          before: oldChannel.parent?.name ?? "*none*",
          after: newChannel.parent?.name ?? "*none*",
        },
      ]);

      // Nothing tracked actually changed (e.g. a permission-overwrite-only
      // update) — still worth a minimal entry rather than silently
      // dropping it, since the goal here is "nothing should miss".
      const embed = new EmbedBuilder()
        .setColor(0xfee75c)
        .setTitle("✏️ Channel Updated")
        .addFields({
          name: "📍 Channel",
          value: `<#${newChannel.id}>`,
        })
        .setTimestamp();

      if (changes.length > 0) {
        embed.addFields(...changes);
      } else {
        embed.addFields({
          name: "ℹ️ Details",
          value: "Permissions or another untracked property changed.",
        });
      }

      await channel.send({ embeds: [embed] });
    } catch (error) {
      logger.error("[ServerLog] Failed to log channel update:", error);
    }
  }

  async logRoleCreate(guild: Guild, role: Role): Promise<void> {
    try {
      const channel = await resolveLogChannel(guild);

      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor(role.color || 0x57f287)
        .setTitle("🎭 Role Created")
        .addFields({
          name: "🏷️ Role",
          value: `${role.name} (\`${role.id}\`)`,
        })
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } catch (error) {
      logger.error("[ServerLog] Failed to log role create:", error);
    }
  }

  async logRoleDelete(guild: Guild, role: Role): Promise<void> {
    try {
      const channel = await resolveLogChannel(guild);

      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("🎭 Role Deleted")
        .addFields({
          name: "🏷️ Role",
          value: `${role.name} (\`${role.id}\`)`,
        })
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } catch (error) {
      logger.error("[ServerLog] Failed to log role delete:", error);
    }
  }

  async logRoleUpdate(
    guild: Guild,
    oldRole: Role,
    newRole: Role,
  ): Promise<void> {
    try {
      const channel = await resolveLogChannel(guild);

      if (!channel) return;

      const changes = diffFields([
        { label: "📛 Name", before: oldRole.name, after: newRole.name },
        {
          label: "🎨 Color",
          before: oldRole.hexColor,
          after: newRole.hexColor,
        },
        { label: "📌 Hoisted", before: oldRole.hoist, after: newRole.hoist },
        {
          label: "💬 Mentionable",
          before: oldRole.mentionable,
          after: newRole.mentionable,
        },
      ]);

      const permissionsChanged = !oldRole.permissions.equals(
        newRole.permissions,
      );

      if (changes.length === 0 && !permissionsChanged) {
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(newRole.color || 0xfee75c)
        .setTitle("🎭 Role Updated")
        .addFields({
          name: "🏷️ Role",
          value: `${newRole.name} (\`${newRole.id}\`)`,
        })
        .setTimestamp();

      if (changes.length > 0) {
        embed.addFields(...changes);
      }

      if (permissionsChanged) {
        embed.addFields({
          name: "🔐 Permissions",
          value: "Permissions were changed.",
        });
      }

      await channel.send({ embeds: [embed] });
    } catch (error) {
      logger.error("[ServerLog] Failed to log role update:", error);
    }
  }

  async logGuildUpdate(
    guild: Guild,
    oldGuild: Guild,
    newGuild: Guild,
  ): Promise<void> {
    try {
      const channel = await resolveLogChannel(guild);

      if (!channel) return;

      const changes = diffFields([
        { label: "📛 Name", before: oldGuild.name, after: newGuild.name },
        {
          label: "🖼️ Icon",
          before: oldGuild.iconURL() ?? "*none*",
          after: newGuild.iconURL() ?? "*none*",
        },
        {
          label: "🔒 Verification Level",
          before: oldGuild.verificationLevel,
          after: newGuild.verificationLevel,
        },
        {
          label: "📢 System Channel",
          before: oldGuild.systemChannelId
            ? `<#${oldGuild.systemChannelId}>`
            : "*none*",
          after: newGuild.systemChannelId
            ? `<#${newGuild.systemChannelId}>`
            : "*none*",
        },
        {
          label: "👑 Owner",
          before: oldGuild.ownerId,
          after: newGuild.ownerId,
        },
      ]);

      if (changes.length === 0) {
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0xfee75c)
        .setTitle("⚙️ Server Updated")
        .addFields(...changes)
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } catch (error) {
      logger.error("[ServerLog] Failed to log guild update:", error);
    }
  }

  async logBanAdd(
    guild: Guild,
    user: User,
    reason: string | null,
  ): Promise<void> {
    try {
      const channel = await resolveLogChannel(guild);

      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("🔨 Member Banned")
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          {
            name: "👤 User",
            value: `${user.tag}\n(\`${user.id}\`)`,
            inline: true,
          },
          {
            name: "📝 Reason",
            value: reason?.trim() || "No reason provided.",
          },
        )
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } catch (error) {
      logger.error("[ServerLog] Failed to log ban add:", error);
    }
  }

  async logBanRemove(guild: Guild, user: User): Promise<void> {
    try {
      const channel = await resolveLogChannel(guild);

      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("🔓 Member Unbanned")
        .setThumbnail(user.displayAvatarURL())
        .addFields({
          name: "👤 User",
          value: `${user.tag}\n(\`${user.id}\`)`,
        })
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } catch (error) {
      logger.error("[ServerLog] Failed to log ban remove:", error);
    }
  }

  async logWebhookUpdate(
    guild: Guild,
    channelId: string,
  ): Promise<void> {
    try {
      const channel = await resolveLogChannel(guild);

      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor(0xfee75c)
        .setTitle("🔗 Webhooks Updated")
        .addFields({
          name: "📍 Channel",
          value: `<#${channelId}>`,
        })
        .setDescription(
          "A webhook was created, deleted, or modified in this channel.",
        )
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } catch (error) {
      logger.error("[ServerLog] Failed to log webhook update:", error);
    }
  }

  async logNicknameChange(
    guild: Guild,
    member: GuildMember,
    oldNick: string | null,
    newNick: string | null,
  ): Promise<void> {
    try {
      const channel = await resolveLogChannel(guild);

      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor(0xfee75c)
        .setTitle("✏️ Nickname Changed")
        .setThumbnail(member.user.displayAvatarURL())
        .addFields(
          {
            name: "👤 Member",
            value: `${member.user.tag}\n(\`${member.id}\`)`,
            inline: true,
          },
          {
            name: "📛 Nickname",
            value: `${oldNick ?? "*none*"} → ${newNick ?? "*none*"}`,
          },
        )
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } catch (error) {
      logger.error("[ServerLog] Failed to log nickname change:", error);
    }
  }

  async logRolesChanged(
    guild: Guild,
    member: GuildMember,
    addedRoles: Role[],
    removedRoles: Role[],
  ): Promise<void> {
    try {
      const channel = await resolveLogChannel(guild);

      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor(0xfee75c)
        .setTitle("🎭 Member Roles Updated")
        .setThumbnail(member.user.displayAvatarURL())
        .addFields({
          name: "👤 Member",
          value: `${member.user.tag}\n(\`${member.id}\`)`,
        })
        .setTimestamp();

      if (addedRoles.length > 0) {
        embed.addFields({
          name: `➕ Added (${addedRoles.length})`,
          value: addedRoles.map((r) => `<@&${r.id}>`).join(", "),
        });
      }

      if (removedRoles.length > 0) {
        embed.addFields({
          name: `➖ Removed (${removedRoles.length})`,
          value: removedRoles.map((r) => `<@&${r.id}>`).join(", "),
        });
      }

      await channel.send({ embeds: [embed] });
    } catch (error) {
      logger.error("[ServerLog] Failed to log role change:", error);
    }
  }

  async logTimeoutChange(
    guild: Guild,
    member: GuildMember,
    oldTimeout: Date | null,
    newTimeout: Date | null,
  ): Promise<void> {
    try {
      const channel = await resolveLogChannel(guild);

      if (!channel) return;

      const wasTimedOut = !!oldTimeout && oldTimeout.getTime() > Date.now();
      const isTimedOut = !!newTimeout && newTimeout.getTime() > Date.now();

      const embed = new EmbedBuilder()
        .setColor(isTimedOut ? 0xed4245 : 0x57f287)
        .setTitle(
          isTimedOut && !wasTimedOut
            ? "🔇 Member Timed Out"
            : "🔊 Timeout Removed",
        )
        .setThumbnail(member.user.displayAvatarURL())
        .addFields({
          name: "👤 Member",
          value: `${member.user.tag}\n(\`${member.id}\`)`,
        })
        .setTimestamp();

      if (isTimedOut && newTimeout) {
        embed.addFields({
          name: "⏱️ Until",
          value: `<t:${Math.floor(newTimeout.getTime() / 1000)}:R>`,
        });
      }

      await channel.send({ embeds: [embed] });
    } catch (error) {
      logger.error("[ServerLog] Failed to log timeout change:", error);
    }
  }

  async logVoiceStateUpdate(
    guild: Guild,
    oldState: VoiceState,
    newState: VoiceState,
  ): Promise<void> {
    try {
      const member = newState.member ?? oldState.member;

      if (!member || member.user.bot) return;

      const channel = await resolveLogChannel(guild);

      if (!channel) return;

      const oldChannelId = oldState.channelId;
      const newChannelId = newState.channelId;

      // Channel join / leave / move — mutually exclusive with each other,
      // handled first since it's the headline event.
      if (oldChannelId !== newChannelId) {
        const embed = new EmbedBuilder()
          .setThumbnail(member.user.displayAvatarURL())
          .addFields({
            name: "👤 Member",
            value: `${member.user.tag}\n(\`${member.id}\`)`,
          })
          .setTimestamp();

        if (!oldChannelId && newChannelId) {
          embed
            .setColor(0x57f287)
            .setTitle("🔊 Joined Voice Channel")
            .addFields({
              name: "📍 Channel",
              value: `<#${newChannelId}>`,
            });
        } else if (oldChannelId && !newChannelId) {
          embed
            .setColor(0xed4245)
            .setTitle("🔇 Left Voice Channel")
            .addFields({
              name: "📍 Channel",
              value: `<#${oldChannelId}>`,
            });
        } else if (oldChannelId && newChannelId) {
          embed
            .setColor(0xfee75c)
            .setTitle("🔀 Moved Voice Channel")
            .addFields({
              name: "📍 Channel",
              value: `<#${oldChannelId}> → <#${newChannelId}>`,
            });
        }

        await channel.send({ embeds: [embed] });
      }

      // Server-applied mute/deafen — staff action, kept separate from
      // self mute/deafen (the user's own client toggle) since the two
      // have very different significance.
      const serverChanges = diffFields([
        {
          label: "🔇 Server Muted",
          before: oldState.serverMute ?? false,
          after: newState.serverMute ?? false,
        },
        {
          label: "🔈 Server Deafened",
          before: oldState.serverDeaf ?? false,
          after: newState.serverDeaf ?? false,
        },
      ]);

      if (serverChanges.length > 0) {
        const embed = new EmbedBuilder()
          .setColor(0xfee75c)
          .setTitle("🎙️ Voice State Updated (Staff)")
          .setThumbnail(member.user.displayAvatarURL())
          .addFields(
            {
              name: "👤 Member",
              value: `${member.user.tag}\n(\`${member.id}\`)`,
            },
            ...serverChanges,
          )
          .setTimestamp();

        await channel.send({ embeds: [embed] });
      }
    } catch (error) {
      logger.error("[ServerLog] Failed to log voice state update:", error);
    }
  }

  async logInviteCreate(guild: Guild, invite: Invite): Promise<void> {
    try {
      const channel = await resolveLogChannel(guild);

      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("🔗 Invite Created")
        .addFields(
          {
            name: "🔑 Code",
            value: `\`${invite.code}\``,
            inline: true,
          },
          {
            name: "📍 Channel",
            value: invite.channel ? `<#${invite.channel.id}>` : "*unknown*",
            inline: true,
          },
          {
            name: "👤 Created By",
            value: invite.inviter
              ? `${invite.inviter.tag}\n(\`${invite.inviter.id}\`)`
              : "*unknown*",
            inline: true,
          },
          {
            name: "♾️ Max Uses",
            value: invite.maxUses ? `${invite.maxUses}` : "Unlimited",
            inline: true,
          },
          {
            name: "⏳ Expires",
            value: invite.maxAge
              ? `<t:${Math.floor(Date.now() / 1000) + invite.maxAge}:R>`
              : "Never",
            inline: true,
          },
          {
            name: "⏱️ Temporary",
            value: invite.temporary ? "Yes" : "No",
            inline: true,
          },
        )
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } catch (error) {
      logger.error("[ServerLog] Failed to log invite create:", error);
    }
  }

  async logInviteDelete(guild: Guild, invite: Invite): Promise<void> {
    try {
      const channel = await resolveLogChannel(guild);

      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("🔗 Invite Deleted")
        .addFields(
          {
            name: "🔑 Code",
            value: `\`${invite.code}\``,
            inline: true,
          },
          {
            name: "📍 Channel",
            value: invite.channel ? `<#${invite.channel.id}>` : "*unknown*",
            inline: true,
          },
        )
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } catch (error) {
      logger.error("[ServerLog] Failed to log invite delete:", error);
    }
  }

  async logEmojiCreate(guild: Guild, emoji: GuildEmoji): Promise<void> {
    try {
      const channel = await resolveLogChannel(guild);

      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("😀 Emoji Created")
        .setThumbnail(emoji.imageURL())
        .addFields({
          name: "🏷️ Emoji",
          value: `${emoji.toString()} \`:${emoji.name}:\` (\`${emoji.id}\`)`,
        })
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } catch (error) {
      logger.error("[ServerLog] Failed to log emoji create:", error);
    }
  }

  async logEmojiDelete(guild: Guild, emoji: GuildEmoji): Promise<void> {
    try {
      const channel = await resolveLogChannel(guild);

      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("😀 Emoji Deleted")
        .setThumbnail(emoji.imageURL())
        .addFields({
          name: "🏷️ Emoji",
          value: `\`:${emoji.name}:\` (\`${emoji.id}\`)`,
        })
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } catch (error) {
      logger.error("[ServerLog] Failed to log emoji delete:", error);
    }
  }

  async logEmojiUpdate(
    guild: Guild,
    oldEmoji: GuildEmoji,
    newEmoji: GuildEmoji,
  ): Promise<void> {
    try {
      if (oldEmoji.name === newEmoji.name) return;

      const channel = await resolveLogChannel(guild);

      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor(0xfee75c)
        .setTitle("😀 Emoji Renamed")
        .setThumbnail(newEmoji.imageURL())
        .addFields({
          name: "🏷️ Emoji",
          value: `${newEmoji.toString()} \`:${oldEmoji.name}:\` → \`:${newEmoji.name}:\``,
        })
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } catch (error) {
      logger.error("[ServerLog] Failed to log emoji update:", error);
    }
  }

  async logStickerCreate(guild: Guild, sticker: Sticker): Promise<void> {
    try {
      const channel = await resolveLogChannel(guild);

      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("🏷️ Sticker Created")
        .setThumbnail(sticker.url)
        .addFields({
          name: "🏷️ Sticker",
          value: `${sticker.name} (\`${sticker.id}\`)`,
        })
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } catch (error) {
      logger.error("[ServerLog] Failed to log sticker create:", error);
    }
  }

  async logStickerDelete(guild: Guild, sticker: Sticker): Promise<void> {
    try {
      const channel = await resolveLogChannel(guild);

      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("🏷️ Sticker Deleted")
        .setThumbnail(sticker.url)
        .addFields({
          name: "🏷️ Sticker",
          value: `${sticker.name} (\`${sticker.id}\`)`,
        })
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } catch (error) {
      logger.error("[ServerLog] Failed to log sticker delete:", error);
    }
  }

  async logStickerUpdate(
    guild: Guild,
    oldSticker: Sticker,
    newSticker: Sticker,
  ): Promise<void> {
    try {
      const changes = diffFields([
        { label: "📛 Name", before: oldSticker.name, after: newSticker.name },
        {
          label: "📝 Description",
          before: oldSticker.description ?? "*none*",
          after: newSticker.description ?? "*none*",
        },
      ]);

      if (changes.length === 0) return;

      const channel = await resolveLogChannel(guild);

      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor(0xfee75c)
        .setTitle("🏷️ Sticker Updated")
        .setThumbnail(newSticker.url)
        .addFields(...changes)
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } catch (error) {
      logger.error("[ServerLog] Failed to log sticker update:", error);
    }
  }

  async logMessageBulkDelete(
    guild: Guild,
    channelId: string,
    count: number,
  ): Promise<void> {
    try {
      const channel = await resolveLogChannel(guild);

      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("🗑️ Bulk Message Delete")
        .addFields(
          {
            name: "📍 Channel",
            value: `<#${channelId}>`,
            inline: true,
          },
          {
            name: "🔢 Count",
            value: `${count}`,
            inline: true,
          },
        )
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } catch (error) {
      logger.error("[ServerLog] Failed to log bulk message delete:", error);
    }
  }
}

export default new ServerLogService();
