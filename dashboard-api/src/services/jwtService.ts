import jwt from "jsonwebtoken";

import config from "../config/index.js";

export interface JwtPayload {
  userId: string;
  sessionId: string;
}

const TOKEN_EXPIRY = "7d";

class JwtService {
  sign(payload: JwtPayload): string {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: TOKEN_EXPIRY,
    });
  }

  verify(token: string): JwtPayload | null {
    try {
      return jwt.verify(token, config.jwt.secret) as JwtPayload;
    } catch {
      return null;
    }
  }
}

export default new JwtService();
