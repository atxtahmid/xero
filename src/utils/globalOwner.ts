import config from "../config/index.js";

export function isGlobalOwner(userId: string): boolean {
  const ownerId = config.owner.id.trim();

  return ownerId.length > 0 && userId === ownerId;
}
