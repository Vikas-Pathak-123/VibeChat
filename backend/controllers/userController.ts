import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import User from "../models/userModel";
import generateToken from "../config/generateToken";

export const registerUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, picture } = req.body;
  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please enter all the fields");
  }
  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error("User already exists");
  }
  const user = await User.create({
    name,
    email,
    password,
    picture,
  });
  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      picture: user.picture,
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error("Failed to create new User");
  }
});

export const authUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      picture: user.picture,
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error("Invalid Email or Password");
  }
});

export const allUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const search = req.query.search as string | undefined;
  const keyword = search
    ? {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }
    : {};

  if (!req.user) {
    res.status(401);
    throw new Error("Not authorized");
  }

  const users = await User.find(keyword).find({ _id: { $ne: req.user._id } });
  res.send(users);
});
