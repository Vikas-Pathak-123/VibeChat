import { Request, Response, NextFunction } from "express";
import User from "../models/userModel";
import asyncHandler from "express-async-handler";
import { verifyAccessToken } from "../services/tokenService";

/**
 * Requires a valid short-lived access token (Bearer). Refresh tokens, legacy
 * tokens without a `type` claim, expired tokens and tokens of deleted users
 * are all 401 — the client then refreshes via POST /api/user/refresh.
 */
export const protect = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401);
    throw new Error("Not authorized, no token");
  }

  let userId: string;
  try {
    userId = verifyAccessToken(header.split(" ")[1]).id;
  } catch {
    res.status(401);
    throw new Error("Not authorized, token failed");
  }

  const user = await User.findById(userId).select("-password");
  if (!user) {
    res.status(401);
    throw new Error("Not authorized, user not found");
  }

  req.user = user;
  next();
});
