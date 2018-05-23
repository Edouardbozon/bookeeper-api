import * as mongoose from "mongoose";
import * as R from "ramda";
import { Request, Response, NextFunction } from "express";
import { LocalStrategyInfo } from "passport-local";
import { asyncMiddleware } from "../common/common";
import { format } from "../common/factories";
import {
  default as Event,
  EventModel,
  EventType,
} from "../models/Shared-flat/Event";
import {
  default as SharedFlat,
  SharedFlatModel,
} from "../models/Shared-flat/Shared-flat";
import { default as User, UserModel } from "../models/User/User";

/**
 * GET /shared-flat/{id}/event
 */
export const getEventList = asyncMiddleware(
  async (req: Request, res: Response, next: NextFunction) => {
    const sharedFlat = (await SharedFlat.findById(
      req.params.id,
    )) as SharedFlatModel;
    const user = (await User.findById(req.user.id)) as UserModel;

    if (undefined == sharedFlat) {
      throw new Error(`Shared flat with id {${req.params.id}} not found`);
    }

    if (!sharedFlat.isMember(user)) {
      throw new Error("Only shared flat resident should see events");
    }

    let filters = { sharedFlatId: sharedFlat.id };
    if (req.params.eventType) {
      filters = R.merge(filters, { eventType: req.params.eventType });
    }

    const events = (await sharedFlat.getLastEvents(
      req.user.id,
      filters,
    )) as EventModel[];
    res.status(200).json(events);
  },
);

/**
 * POST /shared-flat/{id}/draft
 */
export const postEvent = asyncMiddleware(
  async (req: Request, res: Response, next: NextFunction) => {
    const typeSpecificProps: any = { message: req.params.message };
    const eventType = req.params.eventType || EventType.event;

    switch (eventType) {
      case EventType.expenseEvent:
        typeSpecificProps.amount = req.params.amount || 0;
        break;
      case EventType.needEvent:
        typeSpecificProps.requestedResident = req.params.requestedResident;
        break;

      default:
        break;
    }

    const sharedFlat = (await SharedFlat.findById(
      req.params.id,
    )) as SharedFlatModel;

    if (undefined == sharedFlat) {
      throw new Error(`Shared flat with id {${req.params.id}} not found`);
    }

    const event = (await sharedFlat.createEvent(
      req.user.id,
      eventType,
      typeSpecificProps,
    )) as EventModel;

    res.status(201).json(format("Draft created"));
  },
);

/**
 * POST /shared-flat/{id}/event/{event-id}/publish
 */
export const postPublish = asyncMiddleware(
  async (req: Request, res: Response, next: NextFunction) => {
    const sharedFlat = (await SharedFlat.findById(
      req.params.id,
    )) as SharedFlatModel;
    const user = (await User.findById(req.user.id)) as UserModel;

    if (undefined == sharedFlat) {
      throw new Error(`Shared flat with id {${req.params.id}} not found`);
    }

    if (!sharedFlat.isMember(user)) {
      throw new Error("Only shared flat resident should see events");
    }

    // todo: check if user is the author of the published event
    // todo: validate req.body
    const draft = req.body;
    const event = (await Event.findById(req.params.eventId)) as EventModel;

    if (undefined == event) {
      return res
        .status(404)
        .json(format("There is no corresponding event from given draft"));
    }

    event.published = true;
    event.type = draft.type;
    event.amount = draft.amount;
    event.message = draft.message;
    event.requestedResident = draft.requestedResident;
    await event.save();

    res.status(201).json(format("Draft published"));
  },
);
