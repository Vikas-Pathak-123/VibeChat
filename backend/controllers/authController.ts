import { NextFunction, Request, Response } from "express";
import asyncHandler from "express-async-handler";
import passport from "passport";
import { IUser } from "../models/userModel";
import { clientUrl } from "../config/cors";
import { ensureGoogleStrategy, isGoogleAuthConfigured } from "../config/passport";
import { consumeOAuthCode, createOAuthCode } from "../services/googleAuthService";
import { authBody, sendAuthResponse } from "./userController";
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

const redirectWithAuthError = (res: Response, reason: string): void =>
  res.redirect(`${clientUrl()}/?authError=${reason}`);

/** GET /api/user/auth/google — start the Google consent flow. */
export const googleAuthStart = (req: Request, res: Response, next: NextFunction): void => {
  if (!isGoogleAuthConfigured()) return redirectWithAuthError(res, "google_unavailable");
  ensureGoogleStrategy();
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
    prompt: "select_account",
  })(req, res, next);
};

/**
 * GET /api/user/auth/google/callback — Google sends the browser here.
 * The session is not started on this (Render) page: the frontend is a
 * different site, so a cookie set here would not reach its XHRs in browsers
 * that partition cookies. Instead the frontend gets a one-time code and
 * exchanges it via POST /auth/google/exchange, exactly like a login.
 */
export const googleAuthCallback = (req: Request, res: Response, next: NextFunction): void => {
  if (!isGoogleAuthConfigured()) return redirectWithAuthError(res, "google_unavailable");
  ensureGoogleStrategy();
  passport.authenticate("google", { session: false }, (error: unknown, user: IUser | false) => {
    if (error || !user) return redirectWithAuthError(res, "google_failed");
    createOAuthCode(user._id)
      .then((code) => res.redirect(`${clientUrl()}/?oauthCode=${encodeURIComponent(code)}`))
      .catch(next);
  })(req, res, next);
};

/** POST /api/user/auth/google/exchange — trade the one-time code for a session. */
export const googleExchange = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { code } = req.body ?? {};
  if (typeof code !== "string" || !code) {
    res.status(400);
    throw new Error("Missing code");
  }

  const user = await consumeOAuthCode(code);
  if (!user) {
    res.status(401);
    throw new Error("Google sign-in expired, please try again");
  }

  await sendAuthResponse(res, user);
});
