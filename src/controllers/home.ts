import { Request, Response } from "express";
import { asyncMiddleware } from "../common/common";

/**
 * GET /
 * Home page.
 */
export let index = asyncMiddleware(async (req: Request, res: Response) => {
  res.render("home", {
    title: "Home"
  });
});
