import {
  ModerationAction,
} from "@prisma/client";

import db from "./database.js";

export type CaseAction =
  ModerationAction;

export interface CreateCaseOptions {
  guildId: string;

  userId: string;

  moderatorId: string;

  action: CaseAction;

  reason: string;
}

export async function createCase(
  options: CreateCaseOptions,
) {
  return db.case.create({
    data: {
      guildId: options.guildId,
      userId: options.userId,
      moderatorId: options.moderatorId,
      action: options.action,
      reason: options.reason,
    },
  });
}

export async function getCase(
  id: string,
) {
  return db.case.findUnique({
    where: {
      id,
    },
    include: {
      guild: true,
      user: true,
      moderator: true,
    },
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
  return db.case.update({
    where: {
      id,
    },
    data: {
      reason,
    },
  });
}

export async function deleteCase(
  id: string,
) {
  await db.case.delete({
    where: {
      id,
    },
  });

  return true;
}