import { ModerationAction } from "@prisma/client";

import db from "./database.js";
import guildService from "./guildService.js";
import userService from "./userService.js";

export type CaseAction = ModerationAction;

export interface CreateCaseOptions {
  guildId: string;
  userId: string;
  moderatorId: string;
  action: CaseAction;
  reason: string;
}

const caseInclude = {
  guild: true,
  user: true,
  moderator: true,
} as const;

export async function createCase(
  options: CreateCaseOptions,
) {
  const reason =
    options.reason.trim() || "No reason provided.";

  // Case.userId, Case.moderatorId, and Case.guildId are all required
  // foreign keys. Guild rows are reliably created on join (see
  // events/client/guildCreate.ts), but User rows previously had NO
  // creation path anywhere in the codebase — userService.getOrCreate()
  // existed but nothing called it. The first time a moderator acted on
  // someone who'd never interacted with the bot before (the common case,
  // not an edge case), this would throw a foreign-key error AFTER the
  // real Discord punishment already happened — the mod would see
  // "Execution failed" while the user was actually banned/kicked, with
  // no case record at all. Ensuring both rows exist first closes that
  // gap for every current and future caller of this function.
  await Promise.all([
    guildService.getOrCreate(options.guildId),
    userService.getOrCreate(options.userId),
    userService.getOrCreate(options.moderatorId),
  ]);

  return db.case.create({
    data: {
      guildId: options.guildId,
      userId: options.userId,
      moderatorId: options.moderatorId,
      action: options.action,
      reason,
    },
  });
}

export async function getCase(id: string) {
  return db.case.findUnique({
    where: {
      id,
    },
    include: caseInclude,
  });
}

export async function getUserCases(
  guildId: string,
  userId: string,
) {
  return db.case.findMany({
    where: {
      guildId,
      userId,
    },
    include: {
      moderator: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function updateCaseReason(
  id: string,
  reason: string,
) {
  const cleanReason = reason.trim();

  if (!cleanReason) {
    throw new Error("Reason cannot be empty.");
  }

  return db.case.update({
    where: {
      id,
    },
    data: {
      reason: cleanReason,
    },
  });
}

export async function deleteCase(
  id: string,
): Promise<boolean> {
  try {
    await db.case.delete({
      where: {
        id,
      },
    });

    return true;
  } catch {
    return false;
  }
}
