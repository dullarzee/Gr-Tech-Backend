import { Request, Response, NextFunction } from "express-serve-static-core";

const apiKey = (process.env.API_KEY ||
  process.env.NEXT_PUBLIC_API_KEY ||
  "dev-api-key") as string;

export const serverGuard = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const key = req.query.apikey as string;

  if (!key || key !== apiKey) {
    return res
      .status(401)
      .json({ message: "API key is missing or invalid", ok: false });
  }

  next();
};
