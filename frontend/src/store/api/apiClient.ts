import axios from "axios";
import { API_BASE_URL } from "../../constants/api.constants";

/**
 * Shared Axios instance used by all TanStack Query fetch functions.
 *
 * Automatically attaches the JWT Bearer token from localStorage on every
 * request. This mirrors what RTK Query's `prepareHeaders` does but works
 * as a plain axios interceptor — TanStack Query is fetch-library agnostic.
 *
 * Usage:
 *   const { data } = await apiClient.get("/api/chat");
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token on every outgoing request
apiClient.interceptors.request.use((config) => {
  const stored = localStorage.getItem("userInfo");
  if (stored) {
    const { token } = JSON.parse(stored) as { token: string };
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Centralised error handling — log 401s for future refresh-token work (VIB-24)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // TODO VIB-24: trigger token refresh or redirect to login
      console.warn("[apiClient] 401 Unauthorized — token may be expired");
    }
    return Promise.reject(error);
  }
);

export default apiClient;
