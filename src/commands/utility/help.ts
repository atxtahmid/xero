import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";

import { Permission, type Command } from "../../types/Command.js";
import { hasPermission } from "../../utils/permissions.js";

// Category order shown in the embed.
const CATEGORY_ORDER = [
  "General",
  "Ticket",
  "Music",
  "Giveaway",
  "Moderation",
  "Antinuke",
  "Admin",
  "Owner",
] as const;

const CATEGORY_EMOJI: Record<string, string> = {
  General: "🌐",
  Ticket: "🎫",
  Music: "🎵",
  Giveaway: "🎉",
  Moderation: "🔨",
  Antinuke: "🛡️",
  Admin: "⚙️",
  Owner: "👑",
};

// Hardcoded map: command name -> category.
// Permission levels alone can't distinguish Music/Ticket/Giveaway from
// General/Moderation since they share the same Permission tiers.
const COMMAND_CATEGORY: Record<string, string> = {
  // General
  about: "General",
  chat: "General",
  help: "General",
  ping: "General",

  // Ticket
  add: "Ticket",
  claim: "Ticket",
  close: "Ticket",
  delete: "Ticket",
  info: "Ticket",
  "ticket-lock": "Ticket",
  "ticket-unlock": "Ticket",
  remove: "Ticket",
  rename: "Ticket",
  reopen: "Ticket",
  transcript: "Ticket",
  unclaim: "Ticket",

  // Music
  "music-access": "Music",
  "music-clear": "Music",
  "music-filters": "Music",
  "music-leave": "Music",
  "music-loop": "Music",
  "music-nowplaying": "Music",
  "music-pause": "Music",
  "music-play": "Music",
  "music-playlist": "Music",
  "music-queue": "Music",
  "music-remove": "Music",
  "music-resume": "Music",
  "music-seek": "Music",
  "music-shuffle": "Music",
  "music-skip": "Music",
  "music-stop": "Music",
  "music-volume": "Music",

  // Giveaway
  "giveaway-end": "Giveaway",
  "giveaway-reroll": "Giveaway",
  "giveaway-start": "Giveaway",

  // Moderation
  announce: "Moderation",
  ban: "Moderation",
  clean: "Moderation",
  clearwarn: "Moderation",
  clone: "Moderation",
  history: "Moderation",
  kick: "Moderation",
  lock: "Moderation",
  massrole: "Moderation",
  moveall: "Moderation",
  nickname: "Moderation",
  nuke: "Moderation",
  purge: "Moderation",
  removetimeout: "Moderation",
  role: "Moderation",
  say: "Moderation",
  slowmode: "Moderation",
  softban: "Moderation",
  tempban: "Moderation",
  timeout: "Moderation",
  unban: "Moderation",
  unlock: "Moderation",
  voice: "Moderation",
  warn: "Moderation",
  warnings: "Moderation",

  // Antinuke
  "antinuke-coowner-add": "Antinuke",
  "antinuke-coowner-list": "Antinuke",
  "antinuke-coowner-remove": "Antinuke",
  "antinuke-disable": "Antinuke",
  "antinuke-enable": "Antinuke",
  "antinuke-lockdown": "Antinuke",
  "antinuke-punishment": "Antinuke",
  "antinuke-settings": "Antinuke",
  "antinuke-threshold": "Antinuke",
  "whitelist-add": "Antinuke",
  "whitelist-clear": "Antinuke",
  "whitelist-list": "Antinuke",
  "whitelist-remove": "Antinuke",

  // Admin
  "antinuke-log": "Admin",
  "ticket-panel": "Admin",
  "settings-adminrole": "Admin",
  "settings-ai": "Admin",
  "settings-ailog": "Admin",
  "settings-djrole": "Admin",
  "settings-modrole": "Admin",
  "settings-search": "Admin",
  "settings-serverlog": "Admin",
  "settings-welcome": "Admin",

  // Owner
  "backup-create": "Owner",
  "backup-delete": "Owner",
  "backup-info": "Owner",
  "backup-list": "Owner",
  "backup-restore": "Owner",
  "owner-bypass": "Owner",
};

const command: Command = {
  permissions: [Permission.USER],
  guildOnly: false,
  cooldown: 5,

  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("View available commands tailored to your permissions."),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const categories: Record<string, string[]> = {};

    for (const [name, cmd] of interaction.client.commands) {
      const allowed = await hasPermission(interaction, [...cmd.permissions]);

      if (!allowed) continue;

      const category = COMMAND_CATEGORY[name] ?? "General";

      if (!categories[category]) {
        categories[category] = [];
      }

      categories[category].push(`/${name}`);
    }

    const embed = new EmbedBuilder()
      .setTitle("📖 Xero Command Directory")
      .setColor(0x57f287)
      .setDescription("Here are the commands you currently have access to use.")
      .setTimestamp()
      .setFooter({ text: "Xero Security & Support" });

    for (const category of CATEGORY_ORDER) {
      const cmds = categories[category];

      if (!cmds || cmds.length === 0) continue;

      embed.addFields({
        name: `${CATEGORY_EMOJI[category]} ${category}`,
        value: cmds.sort().join(", "),
        inline: false,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};

export default command;
