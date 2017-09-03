import * as passport from "passport";

import { Request, Response, NextFunction } from "express";
import { LocalStrategyInfo } from "passport-local";
import { WriteError } from "mongodb";
import { asyncMiddleware } from "../common/common";

import { default as SharedFlat, SharedFlatModel } from "../models/Shared-flat";

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

        const sharedFlat = new SharedFlat({
            name: req.body.name,
            residents: [{ _id: req.user.id, role: "admin", joinAt: new Date() }],
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
        if (!req.param("id")) {
            return res.status(400).json({ message: "Missing {id} param"});
        }

        SharedFlat.findById(req.param("id"), (err, sharedFlat: SharedFlatModel) => {
            if (err) { return next(); }
            if (!sharedFlat) {
                return res.status(404).json({ message: "Shared flat not found"});
            }

            if (!sharedFlat.shouldBeAdministrateBy(req.user)) {
                return res.status(403).json({ message: "Insufisant permission"});
            }

            SharedFlat.findByIdAndRemove(req.param("id"), (err) => {
                if (err) { return next(); }
                res.status(204).end();
            });
        });
    });
