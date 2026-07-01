import mongoose, { Document, Model } from "mongoose";
import { IUser } from "./userModel";
import { IMessage } from "./messageModel";

export interface IChat extends Document {
  _id: string;
  chatName: string;
  isGroupChat: boolean;
  users: (mongoose.Types.ObjectId | IUser)[];
  latestMessage?: mongoose.Types.ObjectId | IMessage;
  groupAdmin?: mongoose.Types.ObjectId | IUser;
  createdAt: Date;
  updatedAt: Date;
}

const chatSchema = new mongoose.Schema<IChat>(
  {
    chatName: { type: String, trim: true },
    isGroupChat: { type: Boolean, default: false },
    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    latestMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    groupAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

const Chat: Model<IChat> = mongoose.model<IChat>("Chat", chatSchema);
export default Chat;
