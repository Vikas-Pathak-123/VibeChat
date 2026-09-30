import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { authBody } from "./userController";
import { REFRESH_COOKIE, clearRefreshCookie, revokeSession, rotateSession } from "../services/tokenService";

const refreshCookie = (req: Request): string | undefined => {
  const value = req.cookies?.[REFRESH_COOKIE];
  return typeof value === "string" && value ? value : undefined;
};

/** POST /api/user/refresh — rotate the refresh cookie, return user + new access token. */
export const refreshSession = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const raw = refreshCookie(req);
  const session = raw ? await rotateSession(res, raw) : null;

  if (!session) {
    clearRefreshCookie(res);
    res.status(401);
    throw new Error("Session expired, please log in again");
  }

  res.json(authBody(session.user, session.token));
});

/** POST /api/user/logout — revoke this session's refresh token and clear the cookie. */
export const logoutUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const raw = refreshCookie(req);
  if (raw) await revokeSession(raw);

  clearRefreshCookie(res);
  res.json({ message: "Logged out" });
});
