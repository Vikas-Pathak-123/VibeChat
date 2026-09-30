import { queryClient } from "./queryClient";
import { useChatStore } from "./chatStore";

/**
 * Clears per-user client state on logout so the next user on the same tab
 * never sees (or auto-reads) the previous user's chat or notifications.
 */
export const clearSessionState = (): void => {
  useChatStore.getState().setSelectedChat(null);
  queryClient.clear();
};
