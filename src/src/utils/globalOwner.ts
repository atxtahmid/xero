export function isGlobalOwner(userId: string): boolean {
  const globalOwnerId = process.env.BOT_OWNER_ID;

  if (!globalOwnerId) {
    return false;
  }

  return userId === globalOwnerId;
}