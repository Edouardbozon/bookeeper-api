import * as mongoose from "mongoose";
import { default as User, UserModel } from "./User";

export type Address = {
    city: string
    street: string
    postalCode: number
    country: string
};

export type SharedFlatModel = mongoose.Document & {
    name: string
    private: boolean
    size: number
    full: boolean

    residents: [{ _id: string, joinAt: Date, role: string }]
    countResidents: number
    residentsYearsRate: number

    pricePerMonth: number
    location: Address

    _meta: {
        creationDate: Date
        updatedAt: Date
    }

    computeResidentsYearsRate: (residents: UserModel[]) => number
    canBeAdministrateBy: (user: UserModel) => boolean
};

export const sharedFlatSchema = new mongoose.Schema({
    name: { type: String, unique: true, default: Date.now },
    private: { type: Boolean, default: false },
    size: { type: Number, default: 1 },
    full: { type: Boolean, default: false },

    residents: [{ _id: String, joinAt: Date, role: String }],
    countResidents: { type: Number, default: 0 },
    residentsYearsRate: Number,

    pricePerMonth: { type: Number, Required: true },
    location: {
        city: { type: String, required: true },
        street: { type: String, required: true },
        postalCode: { type: Number, required: true },
        country: { type: String, required: true },
    },

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
    // calcule "residents years rate", update "full" props
    const ids = sharedFlat.residents.map((resident) => resident._id);
    User.find({ "_id": { $in: ids }}, (err, residents: UserModel[]) => {
        sharedFlat.countResidents = ids.length;
        sharedFlat.full = sharedFlat.size === sharedFlat.countResidents;
        sharedFlat.residentsYearsRate = sharedFlat.computeResidentsYearsRate(residents);
        next();
    });
});

/**
 * Compute years rate of a shared flat
 */
sharedFlatSchema.methods.computeResidentsYearsRate = function(residents: UserModel[]): number {
    return residents.reduce((acc, resident) => resident.age, 0) / residents.length;
};

/**
 * Check if user can administrate this shared flat
 */
sharedFlatSchema.methods.canBeAdministrateBy = function(user: UserModel): boolean {
    return (this as SharedFlatModel).residents.filter(resident => {
        return resident._id !== user._id && resident.role === "admin";
    }).length === 1;
};

const SharedFlat = mongoose.model("SharedFlat", sharedFlatSchema);
export default SharedFlat;
