import { User } from "./user.types";
import { Chat } from "./chat.types";

/**
 * Represents a single chat message.
 */
export interface Message {
  _id: string;
  sender: User;
  content: string;
  chat: Chat;
  createdAt: string;
  updatedAt: string;
}
