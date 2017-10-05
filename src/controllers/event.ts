import * as passport from "passport";
import * as R from "ramda";

import { Request, Response, NextFunction } from "express";
import { LocalStrategyInfo } from "passport-local";

import { asyncMiddleware } from "../common/common";
import { format } from "../common/factories";

import { default as Event, EventModel, EventType } from "../models/Shared-flat/Event";
import { default as SharedFlat, SharedFlatModel } from "../models/Shared-flat/Shared-flat";
import { default as JoinRequest, JoinRequestModel } from "../models/Shared-flat/Join-request";
import { default as User, UserModel } from "../models/User/User";

/**
 * GET /shared-flat/{id}/event
 */
export const getEventList =
    asyncMiddleware(async (req: Request, res: Response, next: NextFunction) => {
        if (!req.params.id) {
            return res.status(400).json(format("Missing {id} param"));
        }

        try {
            const sharedFlat = await SharedFlat.findById(req.params.id) as SharedFlatModel;
            if (undefined == sharedFlat) throw new Error(`Shared flat with id {${req.params.id}} not found`);
            if (!sharedFlat.isMember(req.user)) throw new Error("Only shared flat resident should see events");

            let filters = { sharedFlatId: sharedFlat.id };
            if (req.params.eventType) {
                filters = R.merge(filters, { eventType: req.params.eventType });
            }

            const events = await sharedFlat.getLastEvents(req.user.id, filters) as EventModel[];
            res.status(200).json(events);
        } catch (err) {
            res.status(500).json(format(err));
        }
    });

/**
 * POST /shared-flat/{id}/event
 */
export const postEvent =
    asyncMiddleware(async (req: Request, res: Response, next: NextFunction) => {
        if (!req.params.id) {
            return res.status(400).json(format("Missing {id} param"));
        }

        const typeSpecificProps: any = {};
        const eventType = req.params.eventType || EventType.event;

        switch (eventType) {
            case EventType.expenseEvent:
                typeSpecificProps.amount = req.params.amount || 0;
                break;
            case EventType.expenseEvent:
                typeSpecificProps.message = req.params.message || undefined;
                typeSpecificProps.requestedResident = req.params.requestedResident || undefined;
                break;

            default:
                break;
        }

        try {
            const sharedFlat = await SharedFlat.findById(req.params.id) as SharedFlatModel;
            if (undefined == sharedFlat) throw new Error(`Shared flat with id {${req.params.id}} not found`);

            const event = await sharedFlat.createEvent(req.user.id, eventType, typeSpecificProps) as EventModel;
            res.status(201).json(format("Event created"));
        } catch (err) {
            res.status(500).json(format(err));
        }
    });
