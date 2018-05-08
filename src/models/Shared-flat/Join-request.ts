import * as mongoose from "mongoose";
import User, { UserModel } from "../User/User";
import SharedFlat, { SharedFlatModel } from "../Shared-flat/Shared-flat";
import { Schema } from "mongoose";
import { createResident } from "../../services/resident.factory";

export type JoinRequestStatus = "pending" | "accepted" | "rejected";

export interface IJoinRequest {
  userId: string;
  sharedFlatId: string;
  doAt: Date;
  status: JoinRequestStatus;
}

export const createJoinRequest = (
  resident: UserModel,
  sharedFlat: SharedFlatModel,
): IJoinRequest => ({
  userId: resident.id,
  sharedFlatId: sharedFlat.id,
  status: "pending",
  doAt: new Date(),
});

export type JoinRequestModel = mongoose.Document &
  IJoinRequest & {
    validateRequest: () => Promise<void>;
    rejectRequest: () => Promise<void>;
  };

export const joinRequestSchema = new mongoose.Schema({
  userId: Schema.Types.ObjectId,
  sharedFlatId: Schema.Types.ObjectId,
  doAt: { type: Date, default: Date.now },
  status: { type: String, default: "pending" },
});

joinRequestSchema.methods.validateRequest = async function(
  this: JoinRequestModel,
) {
  const fromUser = (await User.findById(this.userId)) as UserModel;
  const addResident = {
    $push: {
      residents: createResident(fromUser),
    },
  };

  this.status = "accepted";

  Promise.all([
    await SharedFlat.findByIdAndUpdate(this.sharedFlatId, addResident),
    await this.save(),
  ]);
};

joinRequestSchema.methods.rejectRequest = async function(
  this: JoinRequestModel,
) {
  this.status = "rejected";
  await this.save();
};

const JoinRequest = mongoose.model("JoinRequest", joinRequestSchema);
export default JoinRequest;
