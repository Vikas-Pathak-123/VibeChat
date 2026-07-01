import express from "express";
import {
  registerUser,
  authUser,
  allUsers,
} from "../controllers/userController";
import { protect } from '../Middleware/authMiddleware';

const router = express.Router();

router.route("/").post(registerUser).get(protect, allUsers);
router.post("/login", authUser);

export default router;
