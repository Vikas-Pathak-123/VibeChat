import mongoose from "mongoose";
import Chat from "../models/chatModel";
import User from "../models/userModel";
import Notification from "../models/notificationModel";

type Id = string | mongoose.Types.ObjectId;

/**
 * Persist one unread "message" notification for every chat member except the
 * sender and anyone who muted notifications.
 *
 * The server can't know which chat a recipient has open, so it always creates
 * them; the client marks a chat's notifications read while that chat is open.
 */
export const createMessageNotifications = async (params: {
  messageId: Id;
  chatId: Id;
  senderId: Id;
}): Promise<void> => {
  const chat = await Chat.findById(params.chatId).select("users");
  if (!chat) return;

  const senderId = params.senderId.toString();
  const otherIds = chat.users
    .map((u) => (u as mongoose.Types.ObjectId).toString())
    .filter((id) => id !== senderId);
  if (otherIds.length === 0) return;

  const recipients = await User.find({
    _id: { $in: otherIds },
    muteNotifications: { $ne: true },
  }).select("_id");
  if (recipients.length === 0) return;

  await Notification.insertMany(
    recipients.map((r) => ({
      recipient: r._id,
      sender: params.senderId,
      chat: params.chatId,
      message: params.messageId,
      type: "message",
    }))
  );
};
