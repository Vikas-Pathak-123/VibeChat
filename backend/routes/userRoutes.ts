import express from "express";
import {
  registerUser,
  authUser,
  allUsers,
} from "../controllers/userController";
import {
  refreshSession,
  logoutUser,
  googleAuthStart,
  googleAuthCallback,
  googleExchange,
} from "../controllers/authController";
import { protect } from '../Middleware/authMiddleware';

const router = express.Router();

router.route("/").post(registerUser).get(protect, allUsers);
router.post("/login", authUser);
router.post("/refresh", refreshSession);
router.post("/logout", logoutUser);
router.get("/auth/google", googleAuthStart);
router.get("/auth/google/callback", googleAuthCallback);
router.post("/auth/google/exchange", googleExchange);

export default router;
