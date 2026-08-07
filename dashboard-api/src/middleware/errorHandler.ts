import { NextFunction, Request, Response } from "express";

import logger from "../logger/logger.js";

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(error);
    return;
  }

  logger.error(`[HTTP] ${req.method} ${req.path} failed:`, error);

  res.status(500).json({
    error: "Internal server error.",
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: `No route: ${req.method} ${req.path}`,
  });
}
