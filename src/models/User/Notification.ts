import * as mongoose from "mongoose";

import { UserModel } from "../User/User";

export type NotificationType = "alert" | "success" | "info";

export interface INotification {
    message: string;
    type: NotificationType;
    userId: string;
    createdAt: Date;
    readed: boolean;
}

export type NotificationModel = mongoose.Document & INotification & {
    read: () => Promise<void>
};

export const createNotification = (message: string, type: NotificationType, user: UserModel): INotification =>
    ({ message, type, userId: user.id, createdAt: new Date(), readed: false });

export const notificationSchema = new mongoose.Schema({
    message: String,
    type: String,
    userId: String,
    createdAd: { type: Date, default: Date.now },
    readed: { type: Boolean, default: false },
});

notificationSchema.methods.read = function(this: NotificationModel): Promise<void> {
    return new Promise((resolve, reject) => {
        if (this.readed) reject("Cannot read notification more than once");
        this.readed = true;
        this.save((err: any) => {
            if (err) reject(err);
            resolve();
        });
    });
};

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
