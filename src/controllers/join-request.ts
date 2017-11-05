import * as passport from "passport";

import { Request, Response, NextFunction } from "express";
import { LocalStrategyInfo } from "passport-local";

import { asyncMiddleware } from "../common/common";
import { format } from "../common/factories";

import { default as SharedFlat, SharedFlatModel } from "../models/Shared-flat/Shared-flat";
import { default as JoinRequest, JoinRequestModel } from "../models/Shared-flat/Join-request";
import { default as User, UserModel } from "../models/User/User";

/**
 * GET /shared-flat/{id}/join
 */
export const getJoinSharedFlatRequest =
    asyncMiddleware(async (req: Request, res: Response, next: NextFunction) => {
        if (!req.params.id) {
            return res.status(400).json(format("Missing {id} param"));
        }

        const sharedFlat = await SharedFlat.findById(req.params.id) as SharedFlatModel;
        const joinRequests = await JoinRequest.find({ sharedFlatId: sharedFlat.id }) as JoinRequestModel[];
        res.status(200).json(joinRequests);
    });

/**
 * POST /shared-flat/{id}/join
 */
export const postJoinSharedFlatRequest =
    asyncMiddleware(async (req: Request, res: Response) => {
        if (!req.params.id) {
            return res.status(400).json(format("Missing {id} param"));
        }

        const hasAlreadyRequested = await JoinRequest.findOne({ userId: req.user.id }) as JoinRequestModel;
        if (undefined != hasAlreadyRequested) {
            throw new Error("One of you're request is already pending validation");
        }

        const user = await User.findById(req.user.id) as UserModel;
        if (user.hasSharedFlat) {
            throw new Error(`User ${user.id} has already a shared flat`);
        }

        const sharedFlat = await SharedFlat.findById(req.params.id) as SharedFlatModel;
        user.joinRequestPending = true;

        Promise.all([
            await user.save(),
            await sharedFlat.makeJoinRequest(req.user),
        ]);

        res.status(201).json(format("Request successfully posted"));
    });

/**
 * POST /shared-flat/{sharedFlatId}/join/{joinRequestId}/validate
 */
export const postValidateJoinRequest =
    asyncMiddleware(async (req: Request, res: Response, next: NextFunction) => {
        if (!req.params.sharedFlatId) {
            return res.status(400).json(format("Missing {sharedFlatId} param"));
        }
        if (!req.params.joinRequestId) {
            return res.status(400).json(format("Missing {joinRequestId} param"));
        }

        const user = (req.user as UserModel);
        await user.acceptOrReject(req.params.joinRequestId, req.params.sharedFlatId, "accepted");
        res.status(200).json(format("Request successfully validated"));
    });

/**
 * POST /shared-flat/{sharedFlatId}/join/{joinRequestId}/reject
 */
export const postRejectJoinRequest =
    asyncMiddleware(async (req: Request, res: Response) => {
        if (!req.params.sharedFlatId) {
            return res.status(400).json(format("Missing {sharedFlatId} param"));
        }
        if (!req.params.joinRequestId) {
            return res.status(400).json(format("Missing {joinRequestId} param"));
        }

        const user = (req.user as UserModel);
        await user.acceptOrReject(req.params.joinRequestId, req.params.sharedFlatId, "rejected");
        res.status(200).json(format("Request successfully rejected"));
    });
