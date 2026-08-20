import mongoose, { Document, Model } from "mongoose";
import { IUser } from "./userModel";
import { IChat } from "./chatModel";

export interface IReaction {
  emoji: string;
  userId: mongoose.Types.ObjectId | IUser;
}

export interface IMessage extends Document {
  _id: string;
  sender: mongoose.Types.ObjectId | IUser;
  content: string;
  chat: mongoose.Types.ObjectId | IChat;
  messageType: "text" | "image";
  reactions: IReaction[];
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const reactionSchema = new mongoose.Schema<IReaction>(
  {
    emoji: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema<IMessage>(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    content: { type: String, trim: true },
    chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat" },
    messageType: { type: String, enum: ["text", "image"], default: "text" },
    reactions: { type: [reactionSchema], default: [] },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

const Message: Model<IMessage> = mongoose.model<IMessage>("Message", messageSchema);
export default Message;
