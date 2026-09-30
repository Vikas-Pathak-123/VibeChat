import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import Notification from "../models/notificationModel";
import User from "../models/userModel";

const NOTIFICATION_LIMIT = 50;

//@description     Fetch the logged-in user's unread notifications (newest first)
//@route           GET /api/notifications
//@access          Protected
export const getNotifications = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401);
    throw new Error("Not authorized");
  }

  const notifications = await Notification.find({ recipient: req.user._id, isRead: false })
    .sort({ createdAt: -1, _id: -1 })
    .limit(NOTIFICATION_LIMIT)
    .populate("sender", "name picture email")
    .populate({ path: "chat", populate: { path: "users", select: "name picture email" } })
    .populate("message", "content messageType isDeleted");

  // Drop rows whose chat or sender no longer resolves — the client can't render them
  res.json(notifications.filter((n) => n.chat && n.sender));
});

//@description     Mark one notification read
//@route           PUT /api/notifications/:id/read
//@access          Protected
export const markNotificationRead = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401);
    throw new Error("Not authorized");
  }

  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400);
    throw new Error("Invalid notification id");
  }

  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    res.status(404);
    throw new Error("Notification not found");
  }

  if (notification.recipient.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized to update this notification");
  }

  notification.isRead = true;
  await notification.save();
  res.json(notification);
});

//@description     Mark all of the logged-in user's notifications read
//@route           PUT /api/notifications/read-all
//@access          Protected
export const markAllNotificationsRead = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401);
    throw new Error("Not authorized");
  }

  const result = await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { isRead: true }
  );
  res.json({ modifiedCount: result.modifiedCount });
});

//@description     Mark the logged-in user's notifications for one chat read
//@route           PUT /api/notifications/chat/:chatId/read
//@access          Protected
export const markChatNotificationsRead = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401);
    throw new Error("Not authorized");
  }

  if (!mongoose.isValidObjectId(req.params.chatId)) {
    res.status(400);
    throw new Error("Invalid chat id");
  }

  const result = await Notification.updateMany(
    { recipient: req.user._id, chat: req.params.chatId, isRead: false },
    { isRead: true }
  );
  res.json({ modifiedCount: result.modifiedCount });
});

//@description     Get the logged-in user's notification preferences
//@route           GET /api/notifications/preferences
//@access          Protected
export const getNotificationPreferences = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401);
    throw new Error("Not authorized");
  }

  res.json({ muteNotifications: req.user.muteNotifications === true });
});

//@description     Update the logged-in user's notification preferences
//@route           PUT /api/notifications/preferences
//@access          Protected
export const updateNotificationPreferences = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401);
    throw new Error("Not authorized");
  }

  const { muteNotifications } = req.body;
  if (typeof muteNotifications !== "boolean") {
    res.status(400);
    throw new Error("muteNotifications must be a boolean");
  }

  await User.findByIdAndUpdate(req.user._id, { muteNotifications });
  res.json({ muteNotifications });
});
