export interface DashboardUser {
  id: string;
  username: string;
  avatar: string | null;
}

export interface ManageableGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
}

export interface GuildSettings {
  guildId: string;
  aiEnabled: boolean;
  searchEnabled: boolean;
  logChannelId: string | null;
  serverLogChannelId: string | null;
  aiLogChannelId: string | null;
  welcomeChannelId: string | null;
  welcomeMessage: string | null;
  leaveMessage: string | null;
  autoRoleId: string | null;
  modRoleId: string | null;
  adminRoleId: string | null;
  djRoleId: string | null;
  musicDefaultVolume: number;
}
