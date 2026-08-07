import { Server as HttpServer } from "node:http";

import { Server, Socket } from "socket.io";

import config from "../config/index.js";
import dashboardSessionService from "../services/dashboardSessionService.js";
import jwtService from "../services/jwtService.js";
import logger from "../logger/logger.js";
import permissionSyncService from "../services/permissionSyncService.js";

let io: Server | null = null;

function guildRoom(guildId: string): string {
  return `guild:${guildId}`;
}

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: config.cors.origins,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (typeof token !== "string") {
      next(new Error("Missing auth token."));
      return;
    }

    const payload = jwtService.verify(token);

    if (!payload) {
      next(new Error("Invalid or expired token."));
      return;
    }

    socket.data.userId = payload.userId;
    socket.data.sessionId = payload.sessionId;
    next();
  });

  io.on("connection", (socket: Socket) => {
    logger.info(`[Socket] Client connected: user ${socket.data.userId}`);

    // A client asks to join a specific guild's room — re-verified via
    // Permission Sync, same as every REST route, so a socket connection
    // can't be used to listen in on a guild the user doesn't manage.
    socket.on("join-guild", async (guildId: string) => {
      if (typeof guildId !== "string") return;

      const accessToken = await dashboardSessionService.getValidAccessToken(
        socket.data.sessionId,
      );

      if (!accessToken) {
        socket.emit("error", "Session expired.");
        return;
      }

      const canManage = await permissionSyncService.canManageGuild(
        socket.data.userId,
        accessToken,
        guildId,
      );

      if (!canManage) {
        socket.emit("error", `Not authorized for guild ${guildId}.`);
        return;
      }

      await socket.join(guildRoom(guildId));
      socket.emit("joined-guild", guildId);
    });

    socket.on("leave-guild", (guildId: string) => {
      if (typeof guildId !== "string") return;
      void socket.leave(guildRoom(guildId));
    });

    socket.on("disconnect", () => {
      logger.info(`[Socket] Client disconnected: user ${socket.data.userId}`);
    });
  });

  return io;
}

/**
 * Broadcasts an event to every dashboard client currently viewing a
 * given guild. Right now the only caller is the settings PUT route (so
 * if two staff members have the settings page open at once, both see
 * the change live). It CANNOT yet broadcast things that happen on
 * Discord's side (a new moderation case from /ban, a ticket being
 * created, etc.) — those happen in the BOT's separate process, and
 * there's no connection between the two services yet. Wiring that up
 * (the bot notifying this API, e.g. via an internal webhook or a shared
 * pub/sub) is a distinct next piece, not built in this pass.
 */
export function emitToGuild(
  guildId: string,
  event: string,
  payload: unknown,
): void {
  io?.to(guildRoom(guildId)).emit(event, payload);
}
