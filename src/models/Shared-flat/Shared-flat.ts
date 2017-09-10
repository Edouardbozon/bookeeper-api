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

    rejectJoinReq: (admin: UserModel) => Promise<void>
    getAdmin: () => Resident
    makeJoinRequest: (askingUser: UserModel) => Promise<void>
    computeResidentsYearsRate: (residents: UserModel[]) => number
    shouldBeAdministrateBy: (user: UserModel) => boolean
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
sharedFlatSchema.pre("save", async function save(this: SharedFlatModel, next: Function) {
    if (!this.isModified()) return next();

    // update updateAt whenever a changement in entity
    this.updatedAt = new Date();

    // find shared flat residents to retrieve their age,
    // calcule "residents years rate", update "full" props and "countResidents"
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
sharedFlatSchema.methods.makeJoinRequest = async function makeJoinRequest(this: SharedFlatModel, askingUser: UserModel) {
    if (this.full) throw new Error("Shared flat is full");

    this.residents.forEach((resident: Resident) => {
        if (resident.id === askingUser.id) throw new Error("You're already member of this shared flat");
    });

    const joinRequest = new JoinRequest(createJoinRequest(askingUser, this));

    // catch multiple requests
    const copy = await JoinRequest.findOne({ userId: askingUser.id });
    if (undefined != copy) throw new Error("Request already posted");

    await joinRequest.save();

    const admin = await User.findById(this.getAdmin().id) as UserModel;
    await admin.addNotification(`${askingUser.profile.name} asked to join your shared flat`, "info");
};

/**
 * Get admin from residents
 */
sharedFlatSchema.methods.getAdmin = function getAdmin(this: SharedFlatModel): Resident {
    return this.residents.filter((resident: Resident) => resident.role === "admin")[0];
};

/**
 * Compute years rate of a shared flat
 */
sharedFlatSchema.methods.computeResidentsYearsRate = function computeResidentsYearsRate(residents: UserModel[]): number {
    return residents.reduce((acc, resident) => resident.age, 0) / residents.length;
};

/**
 * Check if shared flat should be administrate by the given user
 */
sharedFlatSchema.methods.shouldBeAdministrateBy = function shouldBeAdministrateBy(this: SharedFlatModel, user: UserModel): boolean {
    let check = false;
    this.residents.forEach(resident => {
        if (resident.id === user.id && resident.role === "admin") {
            check = true;
        }
    });

    return check;
};

const SharedFlat = mongoose.model("SharedFlat", sharedFlatSchema) as mongoose.Model<SharedFlatDocument>;
export default SharedFlat;
