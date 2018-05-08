import * as mongoose from "mongoose";
import { Schema } from "mongoose";

export enum EventType {
  event = "event",
  expenseEvent = "expense-event",
  needEvent = "need-event",
}

export interface IEvent {
  number: number;
  sharedFlatId: string;
  previousExpenseId: string;
  createdAt: Date;
  createdBy: {
    id: string;
    name: string;
    picture: string;
  };
  monthlyActivityAverage: number;
  last: boolean;
  type: EventType;
}

export interface IExpenseEvent extends IEvent {
  totalAmountAtThisTime: number;
  amount: number;
}

export type NeedEventStatus = "fulfilled" | "rejected" | "pending" | "expired";

export interface INeedEvent extends IEvent {
  status: NeedEventStatus;
  message: string;
  requestedResident?: string;
  expireAt: Date;
}

export interface EventModel
  extends mongoose.Document,
    IEvent,
    IExpenseEvent,
    INeedEvent {}

const eventSchema = new mongoose.Schema({
  number: Number,
  sharedFlatId: Schema.Types.ObjectId,
  previousExpenseId: Schema.Types.ObjectId,
  createdAt: { type: Date, default: Date.now },
  createdBy: Object,
  last: Boolean,
  type: String,
  amount: Number,
  monthlyActivityAverage: Number,
  totalAmountAtThisTime: Number,
});

const Event = mongoose.model("Event", eventSchema);
export default Event;
