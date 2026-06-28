import { User } from "./user.types";
import { Message } from "./message.types";

/**
 * Represents a chat (one-on-one or group).
 */
export interface Chat {
  _id: string;
  chatName: string;
  isGroupChat: boolean;
  users: User[];
  latestMessage?: Message;
  groupAdmin?: User;
  createdAt: string;
  updatedAt: string;
}
