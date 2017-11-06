import * as passport from "passport";

import { Request, Response, NextFunction } from "express";
import { LocalStrategyInfo } from "passport-local";
import { asyncMiddleware } from "../common/common";
import { format } from "../common/factories";
import { default as SharedFlat, SharedFlatModel, Address } from "../models/Shared-flat/Shared-flat";
import { UserModel } from "../models/User/User";

/**
 * GET /shared-flat
 */
export const getSharedFlat =
    asyncMiddleware(async (req: Request, res: Response, next: NextFunction) => {
        const sharedFlats = await SharedFlat.find({}) as SharedFlatModel[];
        if (sharedFlats.length === 0) {
            return res.status(404).json(format("No Shared flat found"));
        }

        res.status(200).json(sharedFlats);
    });

/**
 * POST /shared-flat
 */
export const createSharedFlat =
    asyncMiddleware(async (req: Request, res: Response, next: NextFunction) => {
        req.assert("name", "Name is not valid").notEmpty();
        req.assert("size", "Size must be an integer").isInt();
        req.assert("pricePerMonth", "PricePerMonth must be an integer").optional().isInt();
        req.assert("street", "Location is not valid").notEmpty();
        req.assert("postalCode", "Location is not valid").isInt();
        req.assert("city", "Location is not valid").notEmpty();
        req.assert("country", "Location is not valid").notEmpty();

        const errors = req.validationErrors();
        if (errors) {
            return res.status(400).json(errors);
        }

        const uniqueName = await SharedFlat.findOne({ name: req.body.name });
        if (undefined != uniqueName) {
            throw new Error("Name already exists");
        }

        // find if user is already a member of a shared flat
        const memberOf = await SharedFlat.findOne({ "residents.id": req.user.id });
        if (undefined != memberOf) {
            throw new Error("You are already a member of a shared flat.");
        }

        const sharedFlat = new SharedFlat({
            name: req.body.name,
            residents: [{ id: req.user.id, role: "admin", joinAt: new Date() }],
            size: req.body.size,
            pricePerMonth: req.body.pricePerMonth,
            bannerUrl: req.body.bannerUrl,
            iconUrl: req.body.iconUrl,
            // @todo check location validity
            location: {
                street: req.body.street,
                postalCode: req.body.postalCode,
                city: req.body.city,
                country: req.body.country
            }
        });

        const user = req.user as UserModel;
        user.hasSharedFlat = true;
        user.sharedFlatId = sharedFlat.id;

        await Promise.all([
            sharedFlat.save(),
            user.save(),
        ]);

        res.status(201).json(sharedFlat);
    });

/**
 * DELETE /shared-flat/{id}
 */
export const deleteSharedFlat =
    asyncMiddleware(async (req: Request, res: Response, next: NextFunction) => {
        if (!req.params.id) {
            return res.status(400).json(format("Missing {id} param"));
        }

        const sharedFlat = await SharedFlat.findById(req.params.id) as SharedFlatModel;
        if (!sharedFlat.shouldBeAdministrateBy(req.user)) {
            return res.status(403).json(format("Insufficient permission"));
        }

        await SharedFlat.findByIdAndRemove(req.params.id);
        res.status(204).json(format("Shared flat successfully deleted"));
    });

/**
 * PUT /shared-flat/{id}
 */
export const putSharedFlat =
    asyncMiddleware(async (req: Request, res: Response, next: NextFunction) => {
        if (!req.params.id) {
            return res.status(400).json(format("Missing {id} param"));
        }

        req.assert("name", "name is not valid").notEmpty();
        req.assert("size", "size must be an integer").isInt();
        req.assert("pricePerMonth", "pricePerMonth must be an integer").isInt();
        req.assert("street", "street is not valid").notEmpty();
        req.assert("postalCode", "postalCode is not valid").isInt();
        req.assert("city", "city is not valid").notEmpty();
        req.assert("country", "country is not valid").notEmpty();
        req.assert("iconUrl", "iconUrl is not valid").notEmpty().isURL();
        req.assert("bannerUrl", "bannerUrl is not valid").notEmpty().isURL();

        const errors = req.validationErrors();
        if (errors) return res.status(400).json(errors);

        const uniqueName = await SharedFlat.findOne({ name: req.body.name });
        if (undefined != uniqueName) {
            throw new Error("Name already exists");
        }

        const sharedFlat = await SharedFlat.findById(req.params.id) as SharedFlatModel;
        if (!sharedFlat.shouldBeAdministrateBy(req.user)) {
            return res.status(403).json(format("Insufficient permission"));
        }

        const { body } = req;
        const location = ["city", "postalCode", "street", "country"];
        for (const key in body) {
            if (body.hasOwnProperty(key)) {
                const data: string | number = body[key];
                if (location.indexOf(key) > -1) {
                    sharedFlat.location[key] = data;
                }
                sharedFlat[key] = data;
            }
        }

        await sharedFlat.save();
        res.status(200).json(format("Shared flat successfully modified"));
    });


