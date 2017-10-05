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
    needEvent= "need-event",
}

export interface IEvent {
    number: number;
    sharedFlatId: string;
    previousExpenseId: string;
    createdAt: Date;
    createdBy: string;
    last: boolean;
    type: EventType;
}

export interface IExpenseEvent extends IEvent {
    totalAmountAtThisTime: number;
    amount: number;
}

export type NeedEventStatus = "fulfilled" | "rejected" | "pending" | "expired";

export interface INeedEvent extends IEvent {
    status: NeedEventStatus;
    message: string;
    requestedResident?: string;
    expireAt: Date;
}

export interface EventModel extends mongoose.Document, IEvent, IExpenseEvent, INeedEvent {}

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

const Event = mongoose.model("Event", eventSchema);
export default Event;
