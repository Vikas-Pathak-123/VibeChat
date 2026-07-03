import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";
import { User } from "../types";

/**
 * Auth Store — Zustand
 *
 * Handles all client-side authentication state.
 * Persisted to localStorage via zustand/middleware `persist` so the user
 * stays logged in across page refreshes.
 *
 * Rules:
 * - ONLY this store writes to/from localStorage for auth — no component
 *   should call localStorage.setItem("userInfo", ...) directly.
 * - `isAuthLoading` starts true and is set false once the persisted state
 *   has been rehydrated — prevents the blank-screen flash on refresh.
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
    persist(
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
      {
        name: "vibe-auth",           // localStorage key
        partialize: (state) => ({ user: state.user }), // only persist user, not loading state
        onRehydrateStorage: () => (state) => {
          // Once rehydration is complete, mark auth as resolved
          state?.setAuthLoading(false);
        },
      }
    ),
    { name: "AuthStore" }
  )
);
