import * as R from "ramda";
import { Document } from "mongoose";
import { UserModel } from "../models/User/User";
import { SharedFlatModel } from "../models/Shared-flat/Shared-flat";
import {
    default as Event,
    EventModel,
    EventType,
    IEvent,
} from "../models/Shared-flat/Event";


/**
 * Event factory
 * Take care of creating events, linking them by a chain
 */
export default abstract class EventFactory {
    static async create(
        sharedFlat: SharedFlatModel,
        type: EventType,
        createdBy: UserModel,
        specificProps: any = {}
    ): Promise<Document> {

        const previousEvents = await sharedFlat.getLastEvents(createdBy.id);
        const previousEvent = R.head(previousEvents) as EventModel;

        let number: number;
        let previousExpenseId: string;

        // first shared flat event
        if (!previousEvent) {
            number = 0;
            previousExpenseId = undefined;
        } else {
            number = R.add(R.prop("number", previousEvent), 1);
            previousExpenseId = previousEvent.id;
            previousEvent.last = false;
        }

        let event: IEvent = {
            number,
            type,
            last: true,
            sharedFlatId: sharedFlat.id,
            createdBy: createdBy.id,
            createdAt: new Date(),
            previousExpenseId,
        };

        /**
         * build type specifics props
         */
        switch (type) {
            case EventType.expenseEvent:
                if (!R.has("amount", specificProps)) {
                    throw new Error(`{amount} props is missing to instantiate an {${type}}`);
                }

                const { amount } = specificProps;

                let totalAmountAtThisTime = R.pathOr(0, ["totalAmountAtThisTime"], previousEvent);
                totalAmountAtThisTime += amount;

                const expenseProps = { amount, totalAmountAtThisTime };
                event = R.merge(event, expenseProps);
                break;

            case EventType.needEvent:
                if (!R.has("message", specificProps)) {
                    throw new Error(`{message} props is missing to instantiate an {${type}}`);
                }

                const { message } = specificProps;
                const needProps: any = { status: "pending", message };

                if (R.has("requestedResident", specificProps)) {
                    needProps.requestedResident = specificProps.requestedResident;
                }

                event = R.merge(event, needProps);
                break;

            default:
                break;
        }

        const builtEvent = new Event(event) as EventModel;
        const notification = `New ${builtEvent.type} created by ${createdBy.profile.name}`;

        await Promise.all([
            previousEvent.save(),
            builtEvent.save(),
            sharedFlat.notify(notification, "info"),
        ]);

        return builtEvent;
    }
}
