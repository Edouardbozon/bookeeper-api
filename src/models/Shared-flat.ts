import * as mongoose from "mongoose";
import { default as User, UserModel } from "./User";
import { asyncMiddleware } from "../common/common";

export type Address = {
    city: string
    street: string
    postalCode: number
    country: string
};
export type Resident = {
    id: string
    joinAt: Date
    role: string
};

export type JoinRequestStatus = "pending" | "accepted" | "rejected";

export type JoinRequest = {
    id: string
    doAt: Date
    status: JoinRequestStatus
};

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

    joinRequests: JoinRequest[],

    _meta: {
        creationDate: Date
        updatedAt: Date
    }

    getAdmin: () => Resident
    makeJoinRequest: (resident: UserModel, cb: FunctionStringCallback) => FunctionStringCallback
    computeResidentsYearsRate: (residents: UserModel[]) => number
    shouldBeAdministrateBy: (user: UserModel) => boolean
};

export const sharedFlatSchema = new mongoose.Schema({
    name: { type: String, unique: true, default: Date.now },
    private: { type: Boolean, default: false },
    size: { type: Number, default: 1 },
    full: { type: Boolean, default: false },

    residents: [{ id: String, joinAt: Date, role: String }],
    countResidents: { type: Number, default: 0 },
    residentsYearsRate: Number,

    pricePerMonth: { type: Number, Required: true },
    location: {
        city: { type: String, required: true },
        street: { type: String, required: true },
        postalCode: { type: Number, required: true },
        country: { type: String, required: true },
    },

    joinRequests: [{ id: String, doAt: Date, status: String }],

    _meta: {
        creationDate: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
    }
});

/**
 * Parallel middleware
 */
sharedFlatSchema.pre("save", async function save(next) {
    const sharedFlat: SharedFlatModel = this;
    if (!sharedFlat.isModified()) { return next(); }

    // update updateAt whenever a changement in entity
    sharedFlat._meta.updatedAt = new Date();

    // find shared flat residents to retrieve their age,
    // calcule "residents years rate", update "full" props and "countResidents"
    const ids = sharedFlat.residents.map((resident) => resident.id);
    User.find({ "id": { $in: ids }}, (err, residents: UserModel[]) => {

        sharedFlat.countResidents = ids.length;
        sharedFlat.full = sharedFlat.size === sharedFlat.countResidents;
        sharedFlat.residentsYearsRate = sharedFlat.computeResidentsYearsRate(residents);
        next();
    });
});

/**
 * Do a sharedFlat join request
 * Make new shared flat admin notification
 */
sharedFlatSchema.methods.makeJoinRequest = function(
    resident: UserModel,
    cb: FunctionStringCallback
): void {
    const self = (this as SharedFlatModel);
    if (!self.full) {
        self.joinRequests.push(createJoinRequest(resident));
        const adminId = self.getAdmin().id;
        User.findById(adminId, (err, admin: UserModel) => {
            if (err) { return cb; }
            admin.notifications.push(createNotification(`${resident.profile.name}`));
            self.save(cb);
        });
    }
};

/**
 * Get admin from residents
 */
sharedFlatSchema.methods.getAdmin = function(): Resident {
    const self = (this as SharedFlatModel);
    return self.residents.filter((resident: Resident) => resident.role === "admin")[0];
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
sharedFlatSchema.methods.shouldBeAdministrateBy = function(user: UserModel): boolean {
    let check = false;
    (this as SharedFlatModel).residents.forEach(resident => {
        if (resident.id === user.id && resident.role === "admin") {
            check = true;
        }
    });

    return check;
};

const createJoinRequest = (resident: UserModel): JoinRequest => ({
    id: resident.id,
    status: "pending",
    doAt: new Date(),
});

const SharedFlat = mongoose.model("SharedFlat", sharedFlatSchema);
export default SharedFlat;
