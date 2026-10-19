/**
 * Frontend origins allowed to make credentialed requests (the refresh cookie).
 *
 * CLIENT_URL may list several origins, comma-separated. The first entry is
 * also where the Google OAuth callback sends the browser back to.
 */
export const allowedOrigins = (): string[] => {
  const configured = (process.env.CLIENT_URL ?? "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
  if (configured.length) return configured;

  return process.env.NODE_ENV === "production"
    ? ["https://vibe-chat.vercel.app"]
    : ["http://localhost:3000"];
};

export const clientUrl = (): string => allowedOrigins()[0];
