import { createServer } from "node:http";

import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";

import config from "./config/index.js";
import logger from "./logger/logger.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import authRoutes from "./routes/auth.js";
import guildsRoutes from "./routes/guilds.js";
import moderationRoutes from "./routes/moderation.js";
import settingsRoutes from "./routes/settings.js";
import { initSocket } from "./socket/socketService.js";

const app = express();

app.use(
  cors({
    origin: config.cors.origins,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: config.app.name,
    version: config.app.version,
  });
});

app.use("/auth", authRoutes);
app.use("/api/guilds", guildsRoutes);
app.use("/api/guilds", settingsRoutes);
app.use("/api/guilds", moderationRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const httpServer = createServer(app);

initSocket(httpServer);

httpServer.listen(config.port, () => {
  logger.info(
    `${config.app.name} v${config.app.version} listening on port ${config.port} (${config.app.environment})`,
  );
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Promise Rejection:", reason);
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
});
