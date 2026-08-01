import { ModerationAction } from "@prisma/client";

import db from "./database.js";

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