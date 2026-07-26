import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
} from "discord.js";

export enum Permission {
  GLOBAL_OWNER = "GLOBAL_OWNER",

  SERVER_OWNER = "SERVER_OWNER",

  ADMIN = "ADMIN",

  MODERATOR = "MODERATOR",

  ANTINUKE = "ANTINUKE",

  CONFIG = "CONFIG",

  AI = "AI",

  RECOVERY = "RECOVERY",

  USER = "USER",
}

export interface Command {
  data:
    | SlashCommandBuilder
    | SlashCommandOptionsOnlyBuilder;

  permissions: Permission[];

  guildOnly?: boolean;

  ownerOnly?: boolean;

  cooldown?: number;

  execute(
    interaction: ChatInputCommandInteraction,
  ): Promise<void>;
}