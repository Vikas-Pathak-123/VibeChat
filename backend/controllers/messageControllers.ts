import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import Chat from "../models/chatModel";
import User from "../models/userModel";
import Message from "../models/messageModel";

//@description     Get all Messages
//@route           GET /api/Message/:chatId
//@access          Protected
export const allMessages = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    const messages = await Message.find({ chat: req.params.chatId })
      .populate("sender", "name picture email")
      .populate("chat");
    res.json(messages);
  } catch (error: any) {
    res.status(400);
    throw new Error(error.message);
  }
});

//@description     Create New Message
//@route           POST /api/Message/
//@access          Protected
export const sendMessage = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  const { content, chatId } = req.body;

  if (!content || !chatId) {
    console.log("Invalid data passed into request");
    return res.sendStatus(400);
  }

  if (!req.user) {
    res.status(401);
    throw new Error("Not authorized");
  }

  const newMessage = {
    sender: req.user._id,
    content: content,
    chat: chatId,
  };

  try {
    let message: any = await Message.create(newMessage);

    message = await message.populate("sender", "name picture");
    message = await message.populate("chat");
    message = await User.populate(message, {
      path: "chat.users",
      select: "name picture email",
    });

    await Chat.findByIdAndUpdate(req.body.chatId, { latestMessage: message });

    res.json(message);
  } catch (error: any) {
    res.status(400);
    throw new Error(error.message);
  }
});

//@description     Toggle a reaction on a message
//@route           PUT /api/Message/:id/react
//@access          Protected
export const reactToMessage = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  const { emoji } = req.body;
  const { id } = req.params;

  if (!emoji) {
    return res.sendStatus(400);
  }

  if (!req.user) {
    res.status(401);
    throw new Error("Not authorized");
  }

  let message;
  try {
    message = await Message.findById(id);
  } catch (error: any) {
    res.status(400);
    throw new Error(error.message);
  }

  if (!message) {
    res.status(404);
    throw new Error("Message not found");
  }

  const userId = req.user._id.toString();
  const existingIndex = message.reactions.findIndex(
    (r) => r.emoji === emoji && r.userId.toString() === userId
  );

  if (existingIndex >= 0) {
    message.reactions.splice(existingIndex, 1);
  } else {
    message.reactions.push({ emoji, userId: req.user._id as unknown as mongoose.Types.ObjectId });
  }

  await message.save();

  const populated = await message.populate("sender", "name picture email");
  res.json(populated);
});

//@description     Soft-delete a message (sender only)
//@route           DELETE /api/Message/:id
//@access          Protected
export const deleteMessage = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;

  if (!req.user) {
    res.status(401);
    throw new Error("Not authorized");
  }

  let message;
  try {
    message = await Message.findById(id);
  } catch (error: any) {
    res.status(400);
    throw new Error(error.message);
  }

  if (!message) {
    res.status(404);
    throw new Error("Message not found");
  }

  if (message.sender.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized to delete this message");
  }

  message.isDeleted = true;
  await message.save();

  const populated = await message.populate("sender", "name picture email");
  res.json(populated);
});
