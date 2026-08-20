import express from "express";
import { allMessages, sendMessage, reactToMessage, deleteMessage } from "../controllers/messageControllers";
import { protect } from "../Middleware/authMiddleware";

const router = express.Router();

router.route("/:chatId").get(protect, allMessages);
router.route("/").post(protect, sendMessage);
router.route("/:id/react").put(protect, reactToMessage);
router.route("/:id").delete(protect, deleteMessage);

export default router;
