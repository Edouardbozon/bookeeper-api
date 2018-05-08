import * as bcrypt from "bcrypt-nodejs";
import * as crypto from "crypto";
import * as mongoose from "mongoose";
import * as R from "ramda";

import {
  default as Notification,
  NotificationModel,
  INotification,
  NotificationType,
  createNotification,
} from "./Notification";

import {
  default as JoinRequest,
  createJoinRequest,
  JoinRequestModel,
  IJoinRequest,
  joinRequestSchema,
  JoinRequestStatus,
} from "../Shared-flat/Join-request";

import {
  default as SharedFlat,
  SharedFlatModel,
} from "../Shared-flat/Shared-flat";
import { Schema } from "mongoose";

export type UserModel = mongoose.Document & {
  email: string;
  password: string;
  passwordResetToken: string;
  passwordResetExpires: Date;

  facebook: string;
  tokens: AuthToken[];

  hasSharedFlat: boolean;
  sharedFlatId: string;
  joinRequestPending: boolean;

  profile: {
    age: number;
    name: string;
    gender: string;
    location: string;
    website: string;
    picture: string;
  };

  getNotifications: (filters?: Object) => Promise<INotification[]>;
  acceptOrReject: (
    joinReqId: string,
    sharedFlat: SharedFlatModel,
    status: JoinRequestStatus,
  ) => Promise<void>;
  notify: (message: string, type: NotificationType) => Promise<void>;
  comparePassword: (
    candidatePassword: string,
    cb: (err: Error, isMatch: boolean) => Function,
  ) => void;
  gravatar: (size: number) => string;
};

export type AuthToken = {
  accessToken: string;
  kind: string;
};

const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, lowercase: true },
    password: String,
    passwordResetToken: String,
    passwordResetExpires: Date,

    facebook: String,
    twitter: String,
    google: String,
    tokens: Array,

    hasSharedFlat: { type: Boolean, default: false },
    sharedFlatId: { type: Schema.Types.ObjectId, default: undefined },
    joinRequestPending: { type: Boolean, default: false },

    profile: {
      name: String,
      age: Number,
      gender: String,
      location: String,
      website: String,
      picture: String,
    },
  },
  { timestamps: true },
);

/**
 * Password hash middleware.
 */
userSchema.pre("save", async function save(this: UserModel, next: Function) {
  if (!this.isModified("password")) {
    return next();
  }

  bcrypt.genSalt(10, (err, salt) => {
    if (err) return next(err);
    bcrypt.hash(this.password, salt, undefined, (err: mongoose.Error, hash) => {
      if (err) return next(err);
      this.password = hash;
      next();
    });
  });
});

userSchema.methods.acceptOrReject = async function(
  this: UserModel,
  joinReqId: string,
  sharedFlatId: string,
  status: JoinRequestStatus,
) {
  const sharedFlat = (await SharedFlat.findById(
    sharedFlatId,
  )) as SharedFlatModel;
  if (undefined == sharedFlat) throw new Error("Shared flat not found");
  if (this.id !== sharedFlat.getAdmin().id)
    throw new Error("Only shared flat admin should manage join requests");

  const joinRequest = (await JoinRequest.findById(
    joinReqId,
  )) as JoinRequestModel;
  if (undefined == joinRequest) throw new Error("Join request not found");

  const askingUser = (await User.findById(joinRequest.userId)) as UserModel;
  askingUser.joinRequestPending = false;

  if (status === "accepted") {
    askingUser.sharedFlatId = joinRequest.sharedFlatId;
    await Promise.all([
      askingUser.save(),
      joinRequest.validateRequest(),
      sharedFlat.notify(
        `${this.profile.name} ${status} ${
          askingUser.profile.name
        } as resident of ${sharedFlat.name}`,
        "success",
      ),
    ]);
  } else if (status === "rejected") {
    await Promise.all([
      askingUser.save(),
      joinRequest.rejectRequest(),
      sharedFlat.notify(
        `${this.profile.name} ${status} ${
          askingUser.profile.name
        } as resident of ${sharedFlat.name}`,
        "alert",
      ),
    ]);
  } else {
    throw new Error(
      `Logical exception, request must be {accepted} or {rejected}, {${status}} given`,
    );
  }
};

userSchema.methods.notify = function(
  this: UserModel,
  message: string,
  type: NotificationType,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const notification = new Notification(
      createNotification(message, type, this),
    );
    notification.save((err: any, user: UserModel) => {
      if (err) reject(err);
      resolve();
    });
  });
};

userSchema.methods.comparePassword = function(
  this: UserModel,
  candidatePassword: string,
  cb: (err: any, isMatch: any) => {},
) {
  bcrypt.compare(
    candidatePassword,
    this.password,
    (err: mongoose.Error, isMatch: boolean) => {
      cb(err, isMatch);
    },
  );
};

/**
 * Get user notifications ordered by date
 */
userSchema.methods.getNotifications = function(
  this: UserModel,
  filters = {},
): Promise<NotificationModel[]> {
  return new Promise((resolve, reject) => {
    Notification.find(
      R.merge({ userId: this.id }, filters),
      {},
      { sort: { createdAt: -1 } },
      (err: any, notifications: NotificationModel[]) => {
        if (err) reject(err);
        resolve(notifications);
      },
    );
  });
};

/**
 * Helper method for getting user's gravatar.
 */
userSchema.methods.gravatar = function(size = 200) {
  if (!this.email) {
    return `https://gravatar.com/avatar/?s=${size}&d=retro`;
  }

  const md5 = crypto
    .createHash("md5")
    .update(this.email)
    .digest("hex");
  return `https://gravatar.com/avatar/${md5}?s=${size}&d=retro`;
};

const User = mongoose.model("User", userSchema);
export default User;
