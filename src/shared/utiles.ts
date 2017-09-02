export const asyncMiddleware = (fn: Function) => (req: Request, res: Response, next: nextFunction) => {
  Promise.resolve(fn(req, res, next))
    .catch(next);
};
