import User, { IUser } from "../models/userModel";
import Chat, { IChat } from "../models/chatModel";
import Message, { IMessage } from "../models/messageModel";
import Notification, { INotification } from "../models/notificationModel";
import { generateAccessToken } from "../services/tokenService";

export const createUser = async (email: string, name = "Test User"): Promise<IUser> => {
  return User.create({ name, email, password: "password123" });
};

export const tokenFor = (user: IUser): string => {
  return generateAccessToken(user._id);
};

export const createChatWith = async (userIds: (string | IUser["_id"])[]): Promise<IChat> => {
  return Chat.create({ chatName: "test chat", isGroupChat: false, users: userIds });
};

export const createMessage = async (params: {
  sender: string | IUser["_id"];
  chat: string | IChat["_id"];
  content?: string;
}): Promise<IMessage> => {
  return Message.create({
    sender: params.sender,
    chat: params.chat,
    content: params.content ?? "hello",
  });
};

export const createNotification = async (params: {
  recipient: string | IUser["_id"];
  sender: string | IUser["_id"];
  chat: string | IChat["_id"];
  message: string | IMessage["_id"];
  isRead?: boolean;
}): Promise<INotification> => {
  return Notification.create({ ...params, type: "message", isRead: params.isRead ?? false });
};
