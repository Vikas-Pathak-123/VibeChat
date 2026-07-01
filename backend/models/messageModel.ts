import mongoose, { Document, Model } from "mongoose";
import { IUser } from "./userModel";
import { IChat } from "./chatModel";

export interface IMessage extends Document {
  _id: string;
  sender: mongoose.Types.ObjectId | IUser;
  content: string;
  chat: mongoose.Types.ObjectId | IChat;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new mongoose.Schema<IMessage>(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    content: { type: String, trim: true },
    chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat" },
  },
  {
    timestamps: true,
  }
);

const Message: Model<IMessage> = mongoose.model<IMessage>("Message", messageSchema);
export default Message;
