import * as mongoose from "mongoose";
import { UserModel } from "../User/User";
import { SharedFlatModel } from "../Shared-flat/Shared-flat";

export type JoinRequestStatus = "pending" | "accepted" | "rejected";

export interface IJoinRequest {
    userId: string;
    sharedFlatId: string;
    doAt: Date;
    status: JoinRequestStatus;
}

export const createJoinRequest = (resident: UserModel, sharedFlat: SharedFlatModel): IJoinRequest => ({
    userId: resident.id,
    sharedFlatId: sharedFlat.id,
    status: "pending",
    doAt: new Date(),
});

export type JoinRequestModel = mongoose.Document & IJoinRequest & {
    validateRequest: () => Promise<void>
    rejectRequest: () => Promise<void>
};

export const joinRequestSchema = new mongoose.Schema({
    userId: String,
    sharedFlatId: String,
    doAt: { type: Date, default: Date.now },
    status: { type: String, default: "pending" },
});

joinRequestSchema.methods.validateRequest = async function (this: JoinRequestModel) {
    this.status = "accepted";
    await this.save();
};

joinRequestSchema.methods.rejectRequest = async function (this: JoinRequestModel) {
    this.status = "rejected";
    await this.save();
};

const JoinRequest = mongoose.model("JoinRequest", joinRequestSchema);
export default JoinRequest;
