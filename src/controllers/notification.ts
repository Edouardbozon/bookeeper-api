import * as passport from "passport";
import * as R from "ramda";

import { Request, Response, NextFunction } from "express";
import { LocalStrategyInfo } from "passport-local";

import { asyncMiddleware } from "../common/common";
import { format } from "../common/factories";
import { default as User, UserModel } from "../models/User/User";
import { NotificationModel } from "../models/User/Notification";

/**
 * GET /me/notifications
 */
export const getUserNotifications =
    asyncMiddleware(async (req: Request, res: Response, next: NextFunction) => {
        const user = await User.findById(req.user.id) as UserModel;
        const notifications = await user.getNotifications();
        res.status(200).json(notifications);
    });

/**
 * POST /me/notifications/read
 */
export const postReadNotifications =
    asyncMiddleware(async (req: Request, res: Response, next: NextFunction) => {
        const user = await User.findById(req.user.id) as UserModel;
        const unreadNotifications = await user.getNotifications({ readed: false }) as NotificationModel[];

        for (const notification of unreadNotifications) {
            await notification.read();
        }

        res.sendStatus(200);
    });
