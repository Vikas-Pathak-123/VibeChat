import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Chat, Message } from "../types";

/**
 * Chat Store — Zustand
 *
 * Handles UI/client state for the chat experience:
 * - Which chat is currently selected (not server state — no API involved)
 * - Pending notification messages (received via Socket.IO, cleared on chat open)
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
  notifications: Message[];
  typingChats: TypingState;

  // Actions
  setSelectedChat: (chat: Chat | null) => void;
  addNotification: (message: Message) => void;
  clearNotification: (messageId: string) => void;
  clearAllNotifications: () => void;
  setTyping: (chatId: string, isTyping: boolean) => void;
}

export const useChatStore = create<ChatState>()(
  devtools(
    (set) => ({
      selectedChat: null,
      notifications: [],
      typingChats: {},

      setSelectedChat: (chat) =>
        set({ selectedChat: chat }, false, "chat/setSelectedChat"),

      addNotification: (message) =>
        set(
          (state) => ({
            notifications: state.notifications.some((n) => n._id === message._id)
              ? state.notifications
              : [message, ...state.notifications],
          }),
          false,
          "chat/addNotification"
        ),

      clearNotification: (messageId) =>
        set(
          (state) => ({
            notifications: state.notifications.filter((n) => n._id !== messageId),
          }),
          false,
          "chat/clearNotification"
        ),

      clearAllNotifications: () =>
        set({ notifications: [] }, false, "chat/clearAllNotifications"),

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
