import * as passport from "passport";
import * as R from "ramda";

import { Request, Response, NextFunction } from "express";
import { LocalStrategyInfo } from "passport-local";

import { asyncMiddleware } from "../common/common";
import { format } from "../common/factories";

import { default as Event, EventModel, EventType, createEvent } from "../models/Shared-flat/Event";
import { default as SharedFlat, SharedFlatModel } from "../models/Shared-flat/Shared-flat";
import { default as JoinRequest, JoinRequestModel } from "../models/Shared-flat/Join-request";
import { default as User, UserModel } from "../models/User/User";
import { default as Notification, NotificationModel } from "../models/User/Notification";

/**
 * GET /me/notifications
 */
export const getUserNotifications =
    asyncMiddleware(async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = await User.findById(req.user.id) as UserModel;
            const notifications = await user.getNotifications();
            res.status(200).json(notifications);
        } catch (err) {
            res.status(500).json(format(err));
        }
    });

/**
 * POST /me/notifications/read
 */
export const postReadNotifications =
    asyncMiddleware(async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = await User.findById(req.user.id) as UserModel;
            const unreadNotifications = await user.getNotifications({ readed: false }) as NotificationModel[];

            for (const notification of unreadNotifications) {
                await notification.read();
            }

            res.sendStatus(200);
        } catch (err) {
            res.status(500).json(format(err));
        }
    });
