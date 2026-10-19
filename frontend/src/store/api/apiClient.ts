import axios, { AxiosError, isAxiosError } from "axios";
import { API_BASE_URL } from "../../constants/api.constants";
import { User } from "../../types";

import { useAuthStore } from "../authStore";

declare module "axios" {
  interface InternalAxiosRequestConfig {
    /** Set once a request has been retried after a token refresh. */
    _retriedAfterRefresh?: boolean;
  }
}

/**
 * Shared Axios instance used by all TanStack Query fetch functions.
 *
 * - Attaches the in-memory access token (never stored in localStorage).
 * - Sends cookies (`withCredentials`) so the httpOnly refresh cookie reaches
 *   /api/user/refresh, /login and /logout.
 * - On a 401 it refreshes the access token once — shared by every request that
 *   failed at the same time — and retries the request. If the refresh token is
 *   rejected too, the registered session-expired handler signs the user out.
 *
 * Usage:
 *   const { data } = await apiClient.get("/api/chat");
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// Attach the access token on every outgoing request
apiClient.interceptors.request.use((config) => {
  const user = useAuthStore.getState().user;
  if (user?.token) {
    config.headers.Authorization = `Bearer ${user.token}`;
  }
  return config;
});

let onSessionExpired: () => void = () => undefined;

/** Registers what to do when the refresh token is rejected (see session.ts). */
export const setSessionExpiredHandler = (handler: () => void): void => {
  onSessionExpired = handler;
};

let refreshInFlight: Promise<User> | null = null;

/**
 * Exchanges the refresh cookie for a new access token and stores the user.
 * Concurrent callers share one request — two refreshes with the same cookie
 * would race the server's token rotation.
 */
export const refreshSession = (): Promise<User> => {
  if (!refreshInFlight) {
    refreshInFlight = apiClient
      .post<User>("/api/user/refresh")
      .then(({ data }) => {
        useAuthStore.getState().setUser(data);
        return data;
      })
      .catch((error: unknown) => {
        if (isAxiosError(error) && error.response?.status === 401) onSessionExpired();
        throw error;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
};

// Endpoints whose 401 means "bad credentials/session", not "access token expired"
const AUTH_ENDPOINT = /^\/api\/user\/(login|refresh|logout|auth\/)/;

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config;
    if (
      error.response?.status !== 401 ||
      !original ||
      original._retriedAfterRefresh ||
      AUTH_ENDPOINT.test(original.url ?? "")
    ) {
      return Promise.reject(error);
    }

    original._retriedAfterRefresh = true;
    // Sent with an older token than the one we now hold (a refresh finished
    // while it was in flight) — just retry; refreshing again would rotate twice
    const current = useAuthStore.getState().user?.token;
    const alreadyRefreshed = current && original.headers.Authorization !== `Bearer ${current}`;
    if (!alreadyRefreshed) {
      try {
        await refreshSession();
      } catch {
        return Promise.reject(error);
      }
    }
    return apiClient(original); // request interceptor attaches the new token
  }
);

export default apiClient;
