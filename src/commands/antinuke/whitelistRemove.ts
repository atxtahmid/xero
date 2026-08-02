import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import antiNukeWhitelistService from "../../services/antiNukeWhitelistService.js";
import { AntiNukeAction } from "../../utils/antiNukeActions.js";
import { Permission, type Command } from "../../types/Command.js";
import { isHighlyTrusted } from "../../utils/auth.js";

const categories = [
  "ALL",
  AntiNukeAction.BOT_ADD,
  AntiNukeAction.MASS_BAN,
  AntiNukeAction.MASS_KICK,
  AntiNukeAction.CHANNEL_CREATE,
  AntiNukeAction.CHANNEL_DELETE,
  AntiNukeAction.CHANNEL_UPDATE,
  AntiNukeAction.ROLE_CREATE,
  AntiNukeAction.ROLE_DELETE,
  AntiNukeAction.ROLE_UPDATE,
  AntiNukeAction.WEBHOOK_CREATE,
  AntiNukeAction.SERVER_UPDATE,
];

const command: Command = {
  permissions: [Permission.SERVER_OWNER],
  guildOnly: true,
  data: new SlashCommandBuilder()
    .setName("whitelist-remove")
    .setDescription("Remove a whitelist entry (Owner/Co-Owner Only).")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("User").setRequired(true),
    )
    .addStringOption((opt) => {
      opt.setName("category").setDescription("Category").setRequired(true);
      categories.forEach((c) => opt.addChoices({ name: c, value: c }));
      return opt;
    }) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;

    if (!(await isHighlyTrusted(interaction))) {
      await interaction.reply({
        content:
          "❌ Access Denied: This command is restricted to the **Server Owner** and **Co-Owners**.",
        ephemeral: true,
      });
      return;
    }

    const user = interaction.options.getUser("user", true);
    const category = interaction.options.getString("category", true);

    try {
      await antiNukeWhitelistService.remove(interaction.guild.id, user.id, category);
      await interaction.reply({
        content: `✅ Removed \`${category}\` from **${user.tag}**.`,
        ephemeral: true,
      });
    } catch (error: any) {
      await interaction.reply({ content: `❌ ${error.message}`, ephemeral: true });
    }
  },
};
export default command;
