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
export default class EventFactory {
  private static computeMonthlyAverage(
    previousEvents: EventModel[] = [],
    date: Date,
  ): number {
    if (previousEvents.length === 0) {
      return 0;
    }

    const lastEventMonth = new Date(R.head(previousEvents).createdAt);
    const prevMonthEvents = previousEvents.filter(
      previousEvent => previousEvent.createdAt >= lastEventMonth,
    );

    return previousEvents.length;
  }

  public static async create(
    sharedFlat: SharedFlatModel,
    type: EventType,
    createdBy: UserModel,
    specificProps: any = {},
  ): Promise<Document> {
    const previousEvents = (await sharedFlat.getLastEvents(
      createdBy.id,
    )) as EventModel[];
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

    const createdAt = new Date();
    const monthlyActivityAverage = EventFactory.computeMonthlyAverage(
      previousEvents,
      createdAt,
    );

    let event: IEvent = {
      number,
      type,
      last: true,
      sharedFlatId: sharedFlat.id,
      createdBy: {
        id: createdBy.id,
        name: createdBy.profile.name,
        picture: createdBy.profile.picture,
      },
      createdAt,
      previousExpenseId,
      monthlyActivityAverage,
    };

    /**
     * build type specifics props
     */
    switch (type) {
      case EventType.expenseEvent:
        if (!R.has("amount", specificProps)) {
          throw new Error(
            `{amount} props is missing to instantiate an {${type}}`,
          );
        }

        const { amount } = specificProps;

        let totalAmountAtThisTime = R.pathOr(
          0,
          ["totalAmountAtThisTime"],
          previousEvent,
        );
        totalAmountAtThisTime += amount;

        const expenseProps = { amount, totalAmountAtThisTime };
        event = R.merge(event, expenseProps);
        break;

      case EventType.needEvent:
        if (!R.has("message", specificProps)) {
          throw new Error(
            `{message} props is missing to instantiate an {${type}}`,
          );
        }

        const { message } = specificProps;
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
    const notification = `New ${builtEvent.type} created by ${
      createdBy.profile.name
    }`;

    await Promise.all<any>(
      previousEvent
        ? [
            builtEvent.save(),
            previousEvent.save(),
            sharedFlat.notify(notification, "info"),
          ]
        : [builtEvent.save(), sharedFlat.notify(notification, "info")],
    );

    return builtEvent;
  }
}
