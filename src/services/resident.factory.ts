import { UserModel } from "../models/User/User";
import { ResidentRoles } from "../models/Shared-flat/Shared-flat";

export const createResident = (
  user: UserModel,
  role: ResidentRoles = "default",
) => ({
  id: user.id,
  name: user.profile.name,
  picture: user.profile.picture,
  role,
  joinAt: new Date(),
});
