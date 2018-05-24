import SharedFlat, { SharedFlatModel } from "../models/Shared-flat/Shared-flat";
import User, { UserModel } from "../models/User/User";

export const sharedFlatManager = {
  throwIfContextIsWrong: (
    sharedFlatId: string,
    sharedFlat: SharedFlatModel,
    user: UserModel,
  ): void => {
    if (undefined == sharedFlat) {
      throw new Error(`Shared flat with id ${sharedFlatId} not found`);
    }

    if (!sharedFlat.isMember(user)) {
      throw new Error("Only shared flat resident should see events");
    }
  },

  provideContext: async (
    userId: string,
    sharedFlatId: string,
  ): Promise<{ user: UserModel; sharedFlat: SharedFlatModel }> => {
    const sharedFlat = (await SharedFlat.findById(
      sharedFlatId,
    )) as SharedFlatModel;
    const user = (await User.findById(userId)) as UserModel;

    sharedFlatManager.throwIfContextIsWrong(sharedFlatId, sharedFlat, user);

    return { user, sharedFlat };
  },
};
