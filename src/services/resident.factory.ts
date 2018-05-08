import { UserModel } from "../models/User/User";

export const createResident = (user: UserModel) => ({
  id: user.id,
  name: user.profile.name,
  picture: user.profile.picture,
  role: "default",
  joinAt: new Date(),
});
