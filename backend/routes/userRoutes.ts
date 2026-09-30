import express from "express";
import {
  registerUser,
  authUser,
  allUsers,
} from "../controllers/userController";
import { refreshSession, logoutUser } from "../controllers/authController";
import { protect } from '../Middleware/authMiddleware';

const router = express.Router();

router.route("/").post(registerUser).get(protect, allUsers);
router.post("/login", authUser);
router.post("/refresh", refreshSession);
router.post("/logout", logoutUser);

export default router;
