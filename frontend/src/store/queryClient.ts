import { QueryClient } from "@tanstack/react-query";

/**
 * Shared TanStack QueryClient instance.
 *
 * Configuration decisions:
 * - staleTime 30s: data considered fresh for 30s after fetch — avoids
 *   redundant refetches when switching chats rapidly.
 * - gcTime 5min: unused cached data is garbage-collected after 5 minutes.
 * - retry 1: only retry once on failure — chat/message APIs failing twice
 *   in a row indicates a real problem, not a transient blip.
 * - refetchOnWindowFocus false: re-fetching entire chat list on every tab
 *   focus is disruptive for a real-time app (Socket.IO handles live updates).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,          // 30 seconds
      gcTime: 5 * 60 * 1000,         // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,                       // Never retry mutations — avoid double sends
    },
  },
});
