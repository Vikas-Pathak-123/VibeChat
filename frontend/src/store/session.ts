import { queryClient } from "./queryClient";
import { useChatStore } from "./chatStore";
import { useAuthStore } from "./authStore";
import { useSocketStore } from "./socketStore";
import { refreshSession, setSessionExpiredHandler } from "./api/apiClient";
import { logoutUser, exchangeGoogleCode } from "./api/userApi";
import { User } from "../types";
import { API_BASE_URL } from "../constants/api.constants";

// Where the pre-VIB-24 auth store persisted the 30-day token
const LEGACY_AUTH_KEY = "vibe-auth";
// Nonce of the Google sign-in this browser started (login-CSRF binding)
const GOOGLE_NONCE_KEY = "vibe-oauth-nonce";

/**
 * Clears per-user client state on logout so the next user on the same tab
 * never sees (or auto-reads) the previous user's chat or notifications.
 */
export const clearSessionState = (): void => {
  useChatStore.getState().setSelectedChat(null);
  queryClient.clear();
};

/** Signs out locally: socket, user and every piece of per-user state. */
export const endSession = (): void => {
  useSocketStore.getState().disconnect();
  useAuthStore.getState().logout();
  clearSessionState();
};

/**
 * Runs once on app start: restores the session from the httpOnly refresh
 * cookie (the access token is never persisted) and arranges for the session
 * to end whenever the refresh token is rejected later on.
 */
export const restoreSession = async (): Promise<void> => {
  try {
    localStorage.removeItem(LEGACY_AUTH_KEY);
  } catch {
    // storage unavailable (private mode) — nothing to clean up
  }
  setSessionExpiredHandler(endSession);

  try {
    useAuthStore.getState().setUser(await refreshSession());
  } catch {
    useAuthStore.getState().setUser(null);
  }
};

/** Logout: revoke the refresh cookie server-side, then sign out locally regardless. */
export const logoutSession = async (): Promise<void> => {
  try {
    await logoutUser();
  } catch {
    // offline or server error — still sign out on this device
  }
  endSession();
};

const randomNonce = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...Array.from(bytes)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

/**
 * Starts "Continue with Google": remembers a fresh nonce and returns the URL to
 * navigate to. The API echoes the nonce back with the one-time code.
 */
export const startGoogleLogin = (): string => {
  const nonce = randomNonce();
  localStorage.setItem(GOOGLE_NONCE_KEY, nonce);
  return `${API_BASE_URL}/api/user/auth/google?nonce=${nonce}`;
};

/**
 * Finishes "Continue with Google": trade the one-time code for a session —
 * but only for a flow this browser started, so nobody can sign a victim into
 * the attacker's account by sending them a code link (login CSRF).
 */
export const completeGoogleLogin = async (code: string, nonce: string | null): Promise<User> => {
  const expected = localStorage.getItem(GOOGLE_NONCE_KEY);
  localStorage.removeItem(GOOGLE_NONCE_KEY);
  if (!expected || nonce !== expected) {
    throw new Error("This Google sign-in was not started in this browser");
  }

  const user = await exchangeGoogleCode(code);
  useAuthStore.getState().setUser(user);
  return user;
};
