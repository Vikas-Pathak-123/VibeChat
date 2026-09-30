import mongoose, { Document, Model } from "mongoose";
import { IUser } from "./userModel";
import { IChat } from "./chatModel";
import { IMessage } from "./messageModel";

export type NotificationType = "message";

export interface INotification extends Document {
  _id: string;
  recipient: mongoose.Types.ObjectId | IUser;
  sender: mongoose.Types.ObjectId | IUser;
  chat: mongoose.Types.ObjectId | IChat;
  message: mongoose.Types.ObjectId | IMessage;
  type: NotificationType;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new mongoose.Schema<INotification>(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true },
    message: { type: mongoose.Schema.Types.ObjectId, ref: "Message", required: true },
    type: { type: String, enum: ["message"], default: "message" },
    isRead: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// Every read path filters by recipient + unread, newest first
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

const Notification: Model<INotification> = mongoose.model<INotification>(
  "Notification",
  notificationSchema
);
export default Notification;
