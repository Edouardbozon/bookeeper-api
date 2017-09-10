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
        req.assert("name", "Name is not valid").notEmpty();
        req.assert("size", "Size must be an integer").isInt();
        req.assert("pricePerMonth", "PricePerMonth must be an integer").isInt();
        req.assert("street", "Location is not valid").notEmpty();
        req.assert("postalCode", "Location is not valid").isInt();
        req.assert("city", "Location is not valid").notEmpty();
        req.assert("country", "Location is not valid").notEmpty();

        const errors = req.validationErrors();
        if (errors) return res.status(400).json(errors);

        try {
            // find if user is already a member of a shared flat
            const copy = await SharedFlat.findOne({ "residents.id": { $in: [req.user.id] } });
            if (undefined != copy) throw new Error("You are already a member of a shared flat.");

            const sharedFlat = new SharedFlat({
                name: req.body.name,
                residents: [{ id: req.user.id, role: "admin", joinAt: new Date() }],
                size: req.body.size,
                pricePerMonth: req.body.pricePerMonth,

                // @todo check location validity
                location: {
                    street: req.body.street,
                    postalCode: req.body.postalCode,
                    city: req.body.city,
                    country: req.body.country
                }
            });

            await sharedFlat.save();
            res.status(201).json(createResponse("Shared flat successfully created"));
        } catch (err) {
            res.status(500).json(createResponse(err));
        }
    });

/**
 * DELETE /shared-flat/{id}
 */
export const deleteSharedFlat =
    asyncMiddleware(async (req: Request, res: Response, next: NextFunction) => {
        if (!req.params.id) {
            return res.status(400).json(createResponse("Missing {id} param"));
        }

        try {
            const sharedFlat = await SharedFlat.findById(req.params.id) as SharedFlatModel;
            if (!sharedFlat.shouldBeAdministrateBy(req.user)) {
                return res.status(403).json(createResponse("Insufisant permission"));
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


