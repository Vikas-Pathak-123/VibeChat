import crypto from "crypto";
import { CookieOptions, Response } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User, { IUser } from "../models/userModel";

/**
 * Session tokens.
 *
 * - Access token: short-lived JWT ({ id, type: "access" }) sent as a Bearer
 *   header. Returned in the JSON body; the client keeps it in memory only.
 * - Refresh token: long-lived JWT ({ id, type: "refresh", jti }) that only
 *   ever travels in the httpOnly `vibe_rt` cookie. Its SHA-256 hash is stored
 *   on the user (one entry per session) and rotated on every refresh.
 */

export const REFRESH_COOKIE = "vibe_rt";
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
// A rotated token stays usable briefly so two tabs refreshing at once both succeed
export const ROTATION_GRACE_MS = 30 * 1000;
export const MAX_SESSIONS = 10;

const accessSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not defined in environment variables");
  return secret;
};

// Falls back to JWT_SECRET; the `type` claim keeps the two token kinds apart
const refreshSecret = (): string => process.env.REFRESH_TOKEN_SECRET || accessSecret();

export const hashToken = (raw: string): string =>
  crypto.createHash("sha256").update(raw).digest("hex");

export const generateAccessToken = (id: string | IUser["_id"]): string =>
  jwt.sign({ id: String(id), type: "access" }, accessSecret(), {
    expiresIn: (process.env.ACCESS_TOKEN_TTL || "15m") as jwt.SignOptions["expiresIn"],
  });

/** Throws unless `token` is a valid, unexpired access token. */
export const verifyAccessToken = (token: string): { id: string } => {
  const payload = jwt.verify(token, accessSecret()) as jwt.JwtPayload;
  if (payload.type !== "access" || typeof payload.id !== "string") {
    throw new Error("Not an access token");
  }
  return { id: payload.id };
};

const generateRefreshToken = (id: string | IUser["_id"]): string =>
  jwt.sign({ id: String(id), type: "refresh", jti: crypto.randomUUID() }, refreshSecret(), {
    expiresIn: REFRESH_TOKEN_TTL_MS / 1000,
  });

const cookieOptions = (): CookieOptions => {
  const production = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    path: "/api/user",
    // Production frontend (Vercel) and API (Render) are different sites
    sameSite: production ? "none" : "lax",
    secure: production,
  };
};

export const clearRefreshCookie = (res: Response): void => {
  res.clearCookie(REFRESH_COOKIE, cookieOptions());
};

/** Stores a new refresh token for `userId`, pruning expired and excess sessions. */
const storeRefreshToken = async (userId: string | IUser["_id"], raw: string): Promise<void> => {
  const now = new Date();
  await User.updateOne({ _id: userId }, { $pull: { refreshTokens: { expiresAt: { $lte: now } } } });
  await User.updateOne(
    { _id: userId },
    {
      $push: {
        refreshTokens: {
          $each: [{ tokenHash: hashToken(raw), expiresAt: new Date(now.getTime() + REFRESH_TOKEN_TTL_MS) }],
          $slice: -MAX_SESSIONS,
        },
      },
    }
  );
};

/**
 * Starts a session: stores and sets a new refresh cookie, returns an access token.
 * Used by login, register, refresh and the Google code exchange.
 */
export const issueSession = async (res: Response, user: IUser): Promise<string> => {
  const refreshToken = generateRefreshToken(user._id);
  await storeRefreshToken(user._id, refreshToken);
  res.cookie(REFRESH_COOKIE, refreshToken, { ...cookieOptions(), maxAge: REFRESH_TOKEN_TTL_MS });
  return generateAccessToken(user._id);
};

const verifyRefreshToken = (token: string): { id: string } | null => {
  try {
    const payload = jwt.verify(token, refreshSecret()) as jwt.JwtPayload;
    if (payload.type !== "refresh" || !mongoose.isValidObjectId(payload.id)) return null;
    return { id: payload.id };
  } catch {
    return null;
  }
};

/**
 * Exchanges a live refresh token for a new session (rotation).
 * The presented token is cut down to the grace window rather than deleted,
 * so a concurrent refresh from another tab with the same cookie still works.
 * Returns null when the token is invalid, expired, revoked or never issued.
 */
export const rotateSession = async (
  res: Response,
  raw: string
): Promise<{ user: IUser; token: string } | null> => {
  const claims = verifyRefreshToken(raw);
  if (!claims) return null;

  const now = new Date();
  const user = await User.findOneAndUpdate(
    {
      _id: claims.id,
      refreshTokens: { $elemMatch: { tokenHash: hashToken(raw), expiresAt: { $gt: now } } },
    },
    { $min: { "refreshTokens.$.expiresAt": new Date(now.getTime() + ROTATION_GRACE_MS) } },
    { new: true }
  );
  if (!user) return null;

  const token = await issueSession(res, user);
  return { user, token };
};

/** Revokes the session a refresh token belongs to (no-op if unknown). */
export const revokeSession = async (raw: string): Promise<void> => {
  const tokenHash = hashToken(raw);
  await User.updateOne({ "refreshTokens.tokenHash": tokenHash }, { $pull: { refreshTokens: { tokenHash } } });
};
