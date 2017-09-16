import * as mongoose from "mongoose";
import { default as User, UserModel } from "../User/User";
import { default as JoinRequest } from "./Join-request";
import { asyncMiddleware } from "../../common/common";
import { createNotification } from "../User/Notification";
import {
    createJoinRequest,
    JoinRequestModel,
    IJoinRequest,
    joinRequestSchema,
    JoinRequestStatus
} from "./Join-request";

import { SharedFlatModel } from "./Shared-flat";

export enum EventType {
    event = "event",
    expenseEvent = "expense-event",
}

export interface IEvent {
    number: number;
    sharedFlatId: string;
    previousExpenseId: string;
    createdAt: Date;
    createdBy: string;
    last: boolean;
    type: EventType;
    totalAmountAtThisTime: number;
    amount: number;
}

export const createEvent = (
    sharedFlat: SharedFlatModel,
    type: EventType,
    createdBy: UserModel,
    amount: number,
    previousEvent?: EventModel,
): IEvent => {

    let number,
        previousExpenseId,
        totalAmountAtThisTime;

    if (undefined != previousEvent) {
        number = previousEvent.number += 1;
        previousExpenseId = previousEvent.id;
        totalAmountAtThisTime = previousEvent.totalAmountAtThisTime += amount;
    } else {
        number = 0;
        previousExpenseId = "";
        totalAmountAtThisTime = 0;
    }

    return <IEvent>{
        amount,
        number,
        type,
        last: true,
        sharedFlatId: sharedFlat.id,
        previousExpenseId,
        createdAt: new Date(),
        totalAmountAtThisTime,
        createdBy: createdBy.id
    };
};

export type EventModel = mongoose.Document & IEvent;

const eventSchema = new mongoose.Schema({
    number: Number,
    sharedFlatId: String,
    previousExpenseId: String,
    createdAt: { type: Date, default: Date.now },
    createdBy: String,
    last: Boolean,
    type: String,
    amount: Number,
    totalAmountAtThisTime: Number
});

/**
 * Middleware
 */
eventSchema.pre("save", async function save(this: EventModel, next: Function) {
    const prevEvent = await Event.findOne({ number: this.number - 1 }) as EventModel;
    if (undefined != prevEvent) {
        prevEvent.last = false;
        await prevEvent.save();
    }
    next();
});

const Event = mongoose.model("Event", eventSchema);
export default Event;
