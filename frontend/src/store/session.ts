import { queryClient } from "./queryClient";
import { useChatStore } from "./chatStore";
import { useAuthStore } from "./authStore";
import { useSocketStore } from "./socketStore";
import { refreshSession, setSessionExpiredHandler } from "./api/apiClient";
import { logoutUser, exchangeGoogleCode } from "./api/userApi";
import { User } from "../types";

// Where the pre-VIB-24 auth store persisted the 30-day token
const LEGACY_AUTH_KEY = "vibe-auth";

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

/** Finishes "Continue with Google": trade the one-time code for a session. */
export const completeGoogleLogin = async (code: string): Promise<User> => {
  const user = await exchangeGoogleCode(code);
  useAuthStore.getState().setUser(user);
  return user;
};
