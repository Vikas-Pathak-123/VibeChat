import { User } from "./user.types";
import { Chat } from "./chat.types";
import { Message } from "./message.types";

/**
 * A persisted in-app notification (GET /api/notifications).
 * Named AppNotification so it never shadows the DOM `Notification` global.
 */
export interface AppNotification {
  _id: string;
  recipient: string;
  sender: User;
  chat: Chat;
  message: Pick<Message, "_id" | "content" | "messageType" | "isDeleted">;
  type: "message";
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreferences {
  muteNotifications: boolean;
}
