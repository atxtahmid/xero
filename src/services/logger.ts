import { createLogger, format, transports } from "winston";

const isProduction = process.env.NODE_ENV === "production";

const logger = createLogger({
  level: process.env.LOG_LEVEL ?? "info",

  format: isProduction
    ? format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.json(),
      )
    : format.combine(
        format.timestamp({
          format: "YYYY-MM-DD HH:mm:ss",
        }),
        format.colorize(),
        format.errors({ stack: true }),
        format.printf(({ timestamp, level, message, stack, ...meta }) => {
          let output = `[${timestamp}] ${level}: ${message}`;

          if (stack) {
            output += `\n${stack}`;
          }

          if (Object.keys(meta).length) {
            output += `\n${JSON.stringify(meta, null, 2)}`;
          }

          return output;
        }),
      ),

  transports: [
    new transports.Console(),
  ],
});

export default logger;