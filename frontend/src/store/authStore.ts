import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { User } from "../types";

/**
 * Auth Store — Zustand
 *
 * Handles all client-side authentication state.
 * Held in memory only: the access token is short-lived and never written to
 * localStorage. After a page load the session is restored from the httpOnly
 * refresh cookie (see `restoreSession` in store/session.ts).
 *
 * Rules:
 * - No component writes auth data to localStorage.
 * - `isAuthLoading` starts true and is set false once the session restore has
 *   finished — prevents the blank-screen flash and the premature redirect.
 */

interface AuthState {
  user: User | null;
  isAuthLoading: boolean;

  // Actions
  setUser: (user: User | null) => void;
  logout: () => void;
  setAuthLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => ({
      user: null,
      isAuthLoading: true,

      setUser: (user) => set({ user, isAuthLoading: false }, false, "auth/setUser"),

      logout: () => {
        set({ user: null, isAuthLoading: false }, false, "auth/logout");
      },

      setAuthLoading: (loading) =>
        set({ isAuthLoading: loading }, false, "auth/setAuthLoading"),
    }),
    { name: "AuthStore" }
  )
);
