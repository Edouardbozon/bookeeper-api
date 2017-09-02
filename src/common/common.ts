import { Request, Response, NextFunction } from "express";

/**
 * Async middleware that catch errors
 * inside native async functions
 *
 * @param fn
 */
export const asyncMiddleware = (fn: Function) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise
      .resolve(fn(req, res, next))
      .catch(next);
};
