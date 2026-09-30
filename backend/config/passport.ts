import passport from "passport";
import { Strategy as GoogleStrategy, Profile } from "passport-google-oauth20";
import { findOrCreateGoogleUser } from "../services/googleAuthService";

/**
 * Google OAuth is optional: without GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET the
 * routes send the browser back to the frontend with `authError=google_unavailable`.
 * The strategy is registered lazily on first use, so config is read at request time.
 */
export const isGoogleAuthConfigured = (): boolean =>
  Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

let registered = false;

export const ensureGoogleStrategy = (): void => {
  if (registered) return;
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || "/api/user/auth/google/callback",
        // Render terminates TLS at its proxy; trust X-Forwarded-Proto for the callback URL
        proxy: true,
      },
      (_accessToken: string, _refreshToken: string, profile: Profile, done) => {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          done(new Error("Google account has no email address"));
          return;
        }
        findOrCreateGoogleUser({
          googleId: profile.id,
          email,
          emailVerified: profile._json.email_verified === true,
          name: profile.displayName || email,
          picture: profile.photos?.[0]?.value,
        })
          .then((user) => done(null, user))
          .catch((error: Error) => done(error));
      }
    )
  );
  registered = true;
};
