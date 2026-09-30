import express from "express";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  markChatNotificationsRead,
  getNotificationPreferences,
  updateNotificationPreferences,
} from "../controllers/notificationControllers";
import { protect } from "../Middleware/authMiddleware";

const router = express.Router();

router.route("/").get(protect, getNotifications);
router.route("/read-all").put(protect, markAllNotificationsRead);
router
  .route("/preferences")
  .get(protect, getNotificationPreferences)
  .put(protect, updateNotificationPreferences);
router.route("/chat/:chatId/read").put(protect, markChatNotificationsRead);
router.route("/:id/read").put(protect, markNotificationRead);

export default router;
