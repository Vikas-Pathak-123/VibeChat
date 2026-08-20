import { User } from "./user.types";
import { Chat } from "./chat.types";

export interface Reaction {
  emoji: string;
  userId: string;
}

/**
 * Represents a single chat message.
 */
export interface Message {
  _id: string;
  sender: User;
  content: string;
  chat: Chat;
  messageType: "text" | "image";
  reactions: Reaction[];
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}
