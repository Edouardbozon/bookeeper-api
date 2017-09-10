import * as passport from "passport";

import { Request, Response, NextFunction } from "express";
import { LocalStrategyInfo } from "passport-local";
import { WriteError } from "mongodb";
import { asyncMiddleware } from "../common/common";
import { createResponse } from "../common/factories";

import { default as SharedFlat, SharedFlatModel } from "../models/Shared-flat/Shared-flat";
import { default as User, UserModel } from "../models/User/User";

/**
 * GET /shared-flat
 */
export const getSharedFlat =
    asyncMiddleware(async (req: Request, res: Response, next: NextFunction) => {
        SharedFlat.find(
            (err: any, sharedFlats: Document[]) => {
                if (err) { return next(err); }
                if (sharedFlats.length === 0) {
                    return res.status(404).json({ message: "Not Found" });
                }
                res.status(200).json(sharedFlats);
            }
        );
    });

/**
 * POST /shared-flat
 */
export const createSharedFlat =
    asyncMiddleware(async (req: Request, res: Response, next: NextFunction) => {
        // @todo check request body validity
        // req.assert("email", "Email is not valid").isEmail();
        // req.assert("password", "Password must be at least 4 characters long").len({ min: 4 });
        // req.assert("confirmPassword", "Passwords do not match").equals(req.body.password);
        // req.assert("age", "Age is incorrect").isInt();
        // req.sanitize("email").normalizeEmail({ gmail_remove_dots: false });

        // const errors = req.validationErrors();

        // @todo check if user is already in a shared flat

        const sharedFlat = new SharedFlat({
            name: req.body.name,
            residents: [{ id: req.user.id, role: "admin", joinAt: new Date() }],
            size: req.body.size || 4,
            pricePerMonth: req.body.pricePerMonth,
            // @todo check location validity
            location: req.body.location || {
                street: "east street",
                postalCode: 30039,
                city: "NY",
                country: "USA"
            }
        });

        sharedFlat.save((err: WriteError) => {
            if (err) { return next(err); }
            res.status(201).json({ message: "Created" });
        });
    });

/**
 * DELETE /shared-flat/{id}
 */
export const deleteSharedFlat =
    asyncMiddleware(async (req: Request, res: Response, next: NextFunction) => {
        if (!req.params.id) {
            return res.status(400).json({ message: "Missing {id} param"});
        }

        try {
            const sharedFlat = await SharedFlat.findById(req.params.id) as SharedFlatModel;
            if (!sharedFlat.shouldBeAdministrateBy(req.user)) {
                return res.status(403).json({ message: "Insufisant permission" });
            }

            await SharedFlat.findByIdAndRemove(req.params.id);
            res.status(204).json(createResponse("Shared flat successfully deleted"));
        } catch (err) {
            res.status(500).json(createResponse(err));
        }
    });

/**
 * POST /shared-flat/{id}/join
 */
export const postJoinSharedFlatRequest =
    asyncMiddleware(async (req: Request, res: Response, next: NextFunction) => {
        if (!req.params.id) {
            return res.status(400).json(createResponse("Missing {id} param"));
        }

        try {
            const sharedFlat = await SharedFlat.findById(req.params.id) as SharedFlatModel;
            await sharedFlat.makeJoinRequest(req.user);
            res.status(200).json(createResponse("Request succesfully posted"));
        } catch (err) {
            res.status(500).json(createResponse(err));
        }
    });

/**
 * POST /shared-flat/{sharedFlatId}/validate/{joinRequestId}
 */
export const postValidateJoinRequest =
    asyncMiddleware(async (req: Request, res: Response, next: NextFunction) => {
        if (!req.params.sharedFlatId) {
            return res.status(400).json(createResponse("Missing {sharedFlatId} param"));
        }
        if (!req.params.joinRequestId) {
            return res.status(400).json(createResponse("Missing {joinRequestId} param"));
        }

        try {
            const user = await User.findById(req.user.id) as UserModel;
            const sharedFlat = await SharedFlat.findById(req.user.sharedFlatId) as SharedFlatModel;
            await user.acceptOrReject(req.params.joinRequestId, sharedFlat, "accepted");
            res.status(200).json(createResponse("Request succesfully posted"));
        } catch (err) {
            res.status(500).json(createResponse(err));
        }
    });


