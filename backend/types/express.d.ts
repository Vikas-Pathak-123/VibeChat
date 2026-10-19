import { IUser } from "../models/userModel";

// Augments Express's Request type so `req.user` is typed everywhere
// after the `protect` middleware runs, instead of using `any`.
// @types/passport declares `req.user` as `Express.User`, so the augmentation
// goes through that interface rather than redeclaring `Request.user`.
declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface User extends IUser {}
  }
}

export {};
