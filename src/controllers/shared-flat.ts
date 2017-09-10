import * as passport from "passport";

import { Request, Response, NextFunction } from "express";
import { LocalStrategyInfo } from "passport-local";
import { WriteError } from "mongodb";
import { asyncMiddleware } from "../common/common";
import { format } from "../common/factories";

import { default as SharedFlat, SharedFlatModel } from "../models/Shared-flat/Shared-flat";
import { default as User, UserModel } from "../models/User/User";

/**
 * GET /shared-flat
 */
export const getSharedFlat =
    asyncMiddleware(async (req: Request, res: Response, next: NextFunction) => {
        try {
            const sharedFlats = await SharedFlat.find({}) as SharedFlatModel[];
            if (sharedFlats.length === 0) {
                return res.status(404).json(format("No Shared flat found"));
            }
            res.status(200).json(sharedFlats);
        } catch (err) {
            res.status(500).json(format(err));
        }
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
            res.status(201).json(format("Shared flat successfully created"));
        } catch (err) {
            res.status(500).json(format(err));
        }
    });

/**
 * DELETE /shared-flat/{id}
 */
export const deleteSharedFlat =
    asyncMiddleware(async (req: Request, res: Response, next: NextFunction) => {
        if (!req.params.id) {
            return res.status(400).json(format("Missing {id} param"));
        }

        try {
            const sharedFlat = await SharedFlat.findById(req.params.id) as SharedFlatModel;
            if (!sharedFlat.shouldBeAdministrateBy(req.user)) {
                return res.status(403).json(format("Insufisant permission"));
            }

            await SharedFlat.findByIdAndRemove(req.params.id);
            res.status(204).json(format("Shared flat successfully deleted"));
        } catch (err) {
            res.status(500).json(format(err));
        }
    });


