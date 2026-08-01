/**
 * Anti-Nuke action identifiers.
 * These values are stored in the database and used throughout
 * the Anti-Nuke detection system.
 */
export enum AntiNukeAction {
  // Member actions
  BOT_ADD = "BOT_ADD",
  MASS_BAN = "MASS_BAN",
  MASS_KICK = "MASS_KICK",

  // Channel actions
  CHANNEL_CREATE = "CHANNEL_CREATE",
  CHANNEL_DELETE = "CHANNEL_DELETE",
  CHANNEL_UPDATE = "CHANNEL_UPDATE",

  // Role actions
  ROLE_CREATE = "ROLE_CREATE",
  ROLE_DELETE = "ROLE_DELETE",
  ROLE_UPDATE = "ROLE_UPDATE",

  // Webhook actions
  WEBHOOK_CREATE = "WEBHOOK_CREATE",

  // Guild actions
  SERVER_UPDATE = "SERVER_UPDATE",
}