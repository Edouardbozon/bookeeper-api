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
    createEvent,
    EventType
} from "./Event";

import {
    default as Notification,
    NotificationModel,
    NotificationType
} from "../User/Notification";

export type Address = {
    city: string
    street: string
    postalCode: number
    country: string
};
export type Resident = {
    id: string
    joinAt: Date
    role: ResidentRoles
};

export type ResidentRoles = "admin" | "default";

export type SharedFlatModel = mongoose.Document & {
    name: string
    private: boolean
    size: number
    full: boolean

    residents: Resident[]
    countResidents: number
    residentsYearsRate: number

    pricePerMonth: number
    location: Address

    creationDate: Date
    updatedAt: Date

    getAdmin: () => Resident
    isMember: (user: UserModel) => boolean
    shouldBeAdministrateBy: (user: UserModel) => boolean
    notify: (message: string, type: NotificationType, avoid?: string[]) => Promise<void>
    makeJoinRequest: (askingUser: UserModel) => Promise<JoinRequestModel>
    computeResidentsYearsRate: (residents: UserModel[]) => number
    createEvent: (userId: string, eventType: EventType, amount: number) => Promise<EventModel>
};

export type SharedFlatDocument = mongoose.Document & {
    computeResidentsYearsRate: (residents: UserModel[]) => number
};

export const sharedFlatSchema = new mongoose.Schema({
    name: { type: String, unique: true, default: Date.now },
    private: { type: Boolean, default: false },
    size: { type: Number, default: 3 },
    full: { type: Boolean, default: false },

    residents: [{ id: String, joinAt: Date, role: String }],
    countResidents: { type: Number, default: 1 },
    residentsYearsRate: Number,

    pricePerMonth: { type: Number, Required: true },
    location: {
        city: { type: String, required: true },
        street: { type: String, required: true },
        postalCode: { type: Number, required: true },
        country: { type: String, required: true },
    },

    creationDate: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

/**
 * Parallel middleware
 */
sharedFlatSchema.pre("save", async function(this: SharedFlatModel, next: Function) {
    if (!this.isModified()) return next();

    // update updateAt whenever a change is trigger in entity
    this.updatedAt = new Date();

    // find shared flat residents to retrieve their age,
    // calculate "residents years rate", update "full" props and "countResidents"
    const ids = this.residents.map((resident) => resident.id);
    User.find({ "id": { $in: ids }}, ((err: any, residents: UserModel[]) => {

        this.countResidents = ids.length;
        this.full = this.size === this.countResidents;
        this.residentsYearsRate = this.computeResidentsYearsRate(residents);
        next();
    }));
});

/**
 * Create new sharedFlat join request
 * Add new shared flat admin notification
 */
sharedFlatSchema.methods.makeJoinRequest = async function(
    this: SharedFlatModel,
    askingUser: UserModel
): Promise<JoinRequestModel> {
    if (this.full) throw new Error("Shared flat is full");

    this.residents.forEach((resident: Resident) => {
        if (resident.id === askingUser.id) throw new Error("You're already member of this shared flat");
    });

    const memberOf = await SharedFlat.findOne({ "residents.id": { $in: askingUser.id }});
    if (undefined != memberOf) throw new Error("You are already a member of a shared flat");

    const joinRequest = new JoinRequest(createJoinRequest(askingUser, this)) as JoinRequestModel;

    // catch multiple requests
    const copy = await JoinRequest.findOne({ userId: askingUser.id });
    if (undefined != copy) throw new Error("Request already posted");

    const admin = await User.findById(this.getAdmin().id) as UserModel;

    await Promise.all([
        joinRequest.save(),
        this.notify(`${askingUser.profile.name} asked to join your shared flat`, "info"),
        admin.notify(`As ${this.name} admin you have to validate or reject ${askingUser.profile.name} join request`, "info"),
    ]);

    return joinRequest;
};

/**
 * Get admin from residents
 */
sharedFlatSchema.methods.getAdmin = function(this: SharedFlatModel): Resident {
    return this.residents.filter((resident: Resident) => resident.role === "admin")[0];
};

/**
 * Check if given user is member of this shared flat
 */
sharedFlatSchema.methods.isMember = function(this: SharedFlatModel, user: UserModel): boolean {
    return this.residents.filter((resident: Resident) => resident.id !== user.id).length === 1;
};

/**
 * Compute years rate of a shared flat
 */
sharedFlatSchema.methods.computeResidentsYearsRate = function(residents: UserModel[]): number {
    return residents.reduce((acc, resident) => resident.age, 0) / residents.length;
};

/**
 * Check if shared flat should be administrate by the given user
 */
sharedFlatSchema.methods.shouldBeAdministrateBy = function(this: SharedFlatModel, user: UserModel): boolean {
    let check = false;
    this.residents.forEach(resident => {
        if (resident.id === user.id && resident.role === "admin") {
            check = true;
        }
    });

    return check;
};

/**
 * Create an event in a shared flat
 */
sharedFlatSchema.methods.createEvent = async function(
    this: SharedFlatModel,
    userId: string,
    eventType: EventType,
    amount: number
): Promise<EventModel> {
    const user = await User.findById(userId) as UserModel;
    if (!this.isMember(user)) throw new Error("Only shared flat resident can create an event");

    const previousEvent = await Event.findOne({}, {}, { sort: { createdAt: -1 }}) as EventModel;
    const event = new Event(createEvent(this, eventType, user, amount, previousEvent)) as EventModel;

    await Promise.all([
        this.notify(`New ${event.type} created by ${user.profile.name}`, "info"),
        event.save(),
    ]);

    return event;
};

/**
 * Notify all residents of a shared flat
 */
sharedFlatSchema.methods.notify = async function (
    this: SharedFlatModel,
    message: string,
    type: NotificationType,
    avoid: string[] = []
): Promise<void> {
    const userIds = this.residents.map(resident => resident.id);
    const users = await User.find({ id: { $in: userIds } }) as UserModel[];
    for (const user of users) {
        if (avoid.indexOf(user.id) > -1) continue;
        else await user.notify(message, type);
    }
};

const SharedFlat = mongoose.model("SharedFlat", sharedFlatSchema);
export default SharedFlat;
