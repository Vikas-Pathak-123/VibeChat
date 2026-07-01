import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const generateToken = (id: string | mongoose.Types.ObjectId): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }
  return jwt.sign({ id }, secret, {
    expiresIn: "30d",
  });
};

export default generateToken;
