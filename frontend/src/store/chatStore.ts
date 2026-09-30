import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Chat } from "../types";

/**
 * Chat Store — Zustand
 *
 * Handles UI/client state for the chat experience:
 * - Which chat is currently selected (not server state — no API involved)
 * - (Notifications are server state since VIB-23 — see hooks/useNotifications.ts)
 * - Typing indicator state per chat room
 *
 * NOTE: The chat LIST itself is server state managed by TanStack Query
 * (queryKeys.chats.all()). Only the selected chat and UI-specific state
 * lives here.
 */

interface TypingState {
  [chatId: string]: boolean;
}

interface ChatState {
  selectedChat: Chat | null;
  typingChats: TypingState;

  // Actions
  setSelectedChat: (chat: Chat | null) => void;
  setTyping: (chatId: string, isTyping: boolean) => void;
}

export const useChatStore = create<ChatState>()(
  devtools(
    (set) => ({
      selectedChat: null,
      typingChats: {},

      setSelectedChat: (chat) =>
        set({ selectedChat: chat }, false, "chat/setSelectedChat"),

      setTyping: (chatId, isTyping) =>
        set(
          (state) => ({
            typingChats: { ...state.typingChats, [chatId]: isTyping },
          }),
          false,
          "chat/setTyping"
        ),
    }),
    { name: "ChatStore" }
  )
);
