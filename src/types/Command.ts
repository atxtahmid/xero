import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
} from "discord.js";

/**
 * Command permission levels.
 */
export enum Permission {
  USER = "USER",

  AI = "AI",

  MODERATOR = "MODERATOR",

  ADMIN = "ADMIN",

  CONFIG = "CONFIG",

  ANTINUKE = "ANTINUKE",

  RECOVERY = "RECOVERY",

  SERVER_OWNER = "SERVER_OWNER",

  GLOBAL_OWNER = "GLOBAL_OWNER",
}

/**
 * Base command interface.
 */
export interface Command {
  readonly data:
    | SlashCommandBuilder
    | SlashCommandOptionsOnlyBuilder;

  readonly permissions: readonly Permission[];

  readonly guildOnly?: boolean;

  /**
   * Cooldown in seconds.
   */
  readonly cooldown?: number;

  execute(
    interaction: ChatInputCommandInteraction,
  ): Promise<void>;
}