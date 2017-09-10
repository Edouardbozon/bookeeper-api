import * as bcrypt from "bcrypt-nodejs";
import * as crypto from "crypto";
import * as mongoose from "mongoose";

import {
  default as Notification,
  INotification,
  NotificationType,
  createNotification
} from "./Notification";

import {
  default as JoinRequest,
  createJoinRequest,
  JoinRequestModel,
  IJoinRequest,
  joinRequestSchema,
  JoinRequestStatus
} from "../Shared-flat/Join-request";

import {
  default as SharedFlat,
  SharedFlatModel
} from "../Shared-flat/Shared-flat";

export type UserModel = mongoose.Document & {
  email: string,
  password: string,
  passwordResetToken: string,
  passwordResetExpires: Date,
  age: number

  facebook: string,
  tokens: AuthToken[],

  profile: {
    name: string,
    gender: string,
    location: string,
    website: string,
    picture: string
  },

  acceptOrReject: (joinReqId: string, sharedFlat: SharedFlatModel, status: JoinRequestStatus) => Promise<void>
  addNotification: (message: string, type: NotificationType) => Promise<void>;
  comparePassword: (candidatePassword: string, cb: (err: any, isMatch: any) => {}) => void,
  gravatar: (size: number) => string
};

export type AuthToken = {
  accessToken: string,
  kind: string
};

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, lowercase: true },
  password: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  age: Number,

  facebook: String,
  twitter: String,
  google: String,
  tokens: Array,

  profile: {
    name: String,
    gender: String,
    location: String,
    website: String,
    picture: String
  }
}, { timestamps: true });

/**
 * Password hash middleware.
 */
userSchema.pre("save", function save(this: UserModel, next) {
  if (!this.isModified("password")) { return next(); }
  bcrypt.genSalt(10, (err, salt) => {
    if (err) { return next(err); }
    bcrypt.hash(this.password, salt, undefined, (err: mongoose.Error, hash) => {
      if (err) { return next(err); }
      this.password = hash;
      next();
    });
  });
});

userSchema.methods.acceptOrReject = async function (
  this: UserModel,
  joinReqId: string,
  sharedFlatId: string,
  status: JoinRequestStatus
) {
  const sharedFlat = await SharedFlat.findById(sharedFlatId) as SharedFlatModel;
  if (undefined == sharedFlat) throw new Error("Shared flat not found");
  if (this.id !== sharedFlat.getAdmin().id) throw new Error("Only admin should validate a join request");

  const joinRequest = await JoinRequest.findById(joinReqId) as JoinRequestModel;
  if (undefined == sharedFlat) throw new Error("Join request not found");

  if (status === "accepted") {
    await joinRequest.validateRequest();
  } else if (status === "rejected") {
    await joinRequest.rejectRequest();
  } else {
    throw new Error(`Logical exception, request must be {accepted} or {rejected}, {${status}} given`);
  }
};

userSchema.methods.addNotification = function (this: UserModel, message: string, type: NotificationType): Promise<void> {
  return new Promise((resolve, reject) => {
    const notification = new Notification(createNotification(message, type, this));
    notification.save((err: any, user: UserModel) => {
      if (err) reject(err);
      resolve();
    });
  });
};

userSchema.methods.comparePassword = function (
  this: UserModel,
  candidatePassword: string, cb: (err: any, isMatch: any) => {}
) {
  bcrypt.compare(candidatePassword, this.password, (err: mongoose.Error, isMatch: boolean) => {
    cb(err, isMatch);
  });
};


/**
 * Helper method for getting user's gravatar.
 */
userSchema.methods.gravatar = function (size: number) {
  if (!size) {
    size = 200;
  }
  if (!this.email) {
    return `https://gravatar.com/avatar/?s=${size}&d=retro`;
  }
  const md5 = crypto.createHash("md5").update(this.email).digest("hex");
  return `https://gravatar.com/avatar/${md5}?s=${size}&d=retro`;
};

const User = mongoose.model("User", userSchema);
export default User;
