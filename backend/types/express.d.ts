import { IUser } from "../models/userModel";

// Augments Express's Request type so `req.user` is typed everywhere
// after the `protect` middleware runs, instead of using `any`.
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

export {};
