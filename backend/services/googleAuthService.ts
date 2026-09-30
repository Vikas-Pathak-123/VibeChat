import crypto from "crypto";
import User, { IUser } from "../models/userModel";
import { hashToken } from "./tokenService";

export interface GoogleProfileInput {
  googleId: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture?: string;
}

const OAUTH_CODE_TTL_MS = 60 * 1000;

/**
 * Resolves the VibeChat user for a Google sign-in:
 * 1. an account already linked to this Google id;
 * 2. an email/password account with the same email — linked only when Google
 *    has verified the email, so nobody can take over an account by claiming
 *    its address. Registration never proved who owns that address, so linking
 *    also replaces the password and revokes existing sessions: whoever may have
 *    pre-registered it loses access, and the owner signs in with Google;
 * 3. otherwise a new account with a random (unusable) password.
 */
export const findOrCreateGoogleUser = async (profile: GoogleProfileInput): Promise<IUser> => {
  const linked = await User.findOne({ googleId: profile.googleId });
  if (linked) return linked;

  const email = profile.email.toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) {
    if (!profile.emailVerified) {
      throw new Error("Google email is not verified; cannot link it to an existing account");
    }
    existing.googleId = profile.googleId;
    existing.password = crypto.randomBytes(32).toString("hex");
    await existing.save();
    await User.updateOne({ _id: existing._id }, { $set: { refreshTokens: [] } });
    return existing;
  }

  return User.create({
    name: profile.name,
    email,
    password: crypto.randomBytes(32).toString("hex"),
    googleId: profile.googleId,
    ...(profile.picture ? { picture: profile.picture } : {}),
  });
};

/** Creates a single-use, 60-second code the frontend exchanges for a session. */
export const createOAuthCode = async (userId: string | IUser["_id"]): Promise<string> => {
  const code = crypto.randomBytes(32).toString("base64url");
  await User.updateOne(
    { _id: userId },
    { $set: { oauthCode: { codeHash: hashToken(code), expiresAt: new Date(Date.now() + OAUTH_CODE_TTL_MS) } } }
  );
  return code;
};

/** Atomically consumes a code; null when unknown, expired or already used. */
export const consumeOAuthCode = async (code: string): Promise<IUser | null> =>
  User.findOneAndUpdate(
    { "oauthCode.codeHash": hashToken(code), "oauthCode.expiresAt": { $gt: new Date() } },
    { $unset: { oauthCode: 1 } },
    { new: true }
  );
