export function isGlobalOwner(userId: string): boolean {
  console.log("BOT_OWNER_ID:", process.env.BOT_OWNER_ID);
  console.log("USER_ID:", userId);

  return userId === process.env.BOT_OWNER_ID;
}