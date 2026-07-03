/**
 * Store barrel export.
 *
 * Import stores and utilities from here, not individual files:
 *   import { useAuthStore, useChatStore, queryClient, queryKeys } from "../store";
 */

export { useAuthStore }   from "./authStore";
export { useChatStore }   from "./chatStore";
export { useSocketStore } from "./socketStore";
export { queryClient }    from "./queryClient";
export { queryKeys }      from "./keys/queryKeys";
export { default as apiClient } from "./api/apiClient";

// API fetch functions — used as queryFn / mutationFn in components
export * from "./api/userApi";
export * from "./api/chatApi";
export * from "./api/messageApi";
