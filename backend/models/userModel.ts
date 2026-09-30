import mongoose, { Document, Model } from "mongoose";
import bcrypt from "bcryptjs";

export interface IRefreshTokenEntry {
  tokenHash: string;
  expiresAt: Date;
}

export interface IOAuthCode {
  codeHash: string;
  expiresAt: Date;
}

export interface IUser extends Document {
  _id: string;
  name: string;
  email: string;
  password: string;
  picture: string;
  muteNotifications: boolean;
  refreshTokens: IRefreshTokenEntry[];
  googleId?: string;
  oauthCode?: IOAuthCode;
  createdAt: Date;
  updatedAt: Date;
  matchPassword: (enteredPassword: string) => Promise<boolean>;
}

const userSchema = new mongoose.Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    picture: {
      type: String,
      default:
        "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg",
    },
    muteNotifications: { type: Boolean, default: false },
    // SHA-256 hashes of this user's live refresh tokens, one per session/device
    refreshTokens: {
      type: [{ _id: false, tokenHash: String, expiresAt: Date }],
      default: [],
      select: false,
    },
    googleId: { type: String, unique: true, sparse: true, select: false },
    // One-time code handed to the frontend after the Google callback
    oauthCode: {
      type: new mongoose.Schema({ codeHash: String, expiresAt: Date }, { _id: false }),
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.methods.matchPassword = async function (
  this: IUser,
  enteredPassword: string
): Promise<boolean> {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.pre<IUser>("save", async function (this: IUser, next) {
  if (!this.isModified("password")) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);
export default User;
