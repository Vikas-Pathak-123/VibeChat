import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { io, Socket } from "socket.io-client";
import { SOCKET_ENDPOINT } from "../constants/api.constants";
import { User } from "../types";
import { Message } from "../types";
import { queryClient } from "./queryClient";
import { queryKeys } from "./keys/queryKeys";
import { useChatStore } from "./chatStore";

/**
 * Socket Store — Zustand
 *
 * Manages the Socket.IO connection lifecycle:
 * - connect() called once on login → socket lives for the entire session
 * - disconnect() called on logout → cleans up listeners
 * - joinRoom() called when selectedChat changes
 *
 * Incoming socket events update:
 * - TanStack Query cache (new message → invalidate messages query)
 * - Zustand chatStore (notifications, typing indicators)
 *
 * This replaces the previous socketRef inside SingleChat.tsx.
 * The socket NO LONGER reconnects on every chat switch.
 */

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;

  connect: (user: User) => void;
  disconnect: () => void;
  joinRoom: (chatId: string) => void;
  emitTyping: (chatId: string) => void;
  emitStopTyping: (chatId: string) => void;
  emitNewMessage: (message: Message) => void;
}

export const useSocketStore = create<SocketState>()(
  devtools(
    (set, get) => ({
      socket: null,
      isConnected: false,

      connect: (user: User) => {
        const existing = get().socket;
        if (existing?.connected) return; // Already connected — guard against double calls

        const socket = io(SOCKET_ENDPOINT);

        socket.on("connect", () => {
          socket.emit("setup", user);
          set({ socket, isConnected: true }, false, "socket/connect");
        });

        socket.on("disconnect", () => {
          set({ isConnected: false }, false, "socket/disconnect");
        });

        // ── Incoming message ─────────────────────────────────────────────────
        socket.on("message recieved", (newMessage: Message) => {
          const { selectedChat, addNotification } = useChatStore.getState();

          if (selectedChat?._id === newMessage.chat._id) {
            // Active chat → invalidate TanStack Query cache so messages refetch
            queryClient.invalidateQueries({
              queryKey: queryKeys.messages.list(newMessage.chat._id),
            });
          } else {
            // Background chat → add to notification badge
            addNotification(newMessage);
          }

          // Always invalidate chat list so latest message preview updates
          queryClient.invalidateQueries({ queryKey: queryKeys.chats.all() });
        });

        // ── Typing indicators ────────────────────────────────────────────────
        socket.on("typing", (chatId: string) => {
          useChatStore.getState().setTyping(chatId, true);
        });

        socket.on("stop typing", (chatId: string) => {
          useChatStore.getState().setTyping(chatId, false);
        });

        set({ socket, isConnected: false }, false, "socket/initializing");
      },

      disconnect: () => {
        get().socket?.disconnect();
        set({ socket: null, isConnected: false }, false, "socket/disconnected");
      },

      joinRoom: (chatId: string) => {
        get().socket?.emit("join chat", chatId);
      },

      emitTyping: (chatId: string) => {
        get().socket?.emit("typing", chatId);
      },

      emitStopTyping: (chatId: string) => {
        get().socket?.emit("stop typing", chatId);
      },

      emitNewMessage: (message: Message) => {
        get().socket?.emit("new message", message);
      },
    }),
    { name: "SocketStore" }
  )
);
