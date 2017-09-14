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

import {
    default as Event,
    EventModel,
    EventType,
    event
} from "./Event";

export type ExpenseEventModel = EventModel & {
    amount: number
    totalAmountAtThisTime: number
    type: EventType.expenseEvent
};

const expenseEvent = Object.assign({
    amount: Number,
    totalAmountAtThisTime: Number,
}, event);

export const expenseEventSchema = new mongoose.Schema(expenseEvent);

expenseEventSchema.pre("save", async function save(this: ExpenseEventModel, next: Function) {
    const newEvent = await Event.findOne({ number: { $gt: this.number } });
    if (newEvent) this.last = false;
});
