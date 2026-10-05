import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined.");
}

export interface AuthPayload {
  userId: number;
  role: "ADMIN" | "STAFF";
}

const isAuthPayload = (value: unknown): value is AuthPayload => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const payload = value as Record<string, unknown>;

  return (
    typeof payload.userId === "number" &&
    Number.isInteger(payload.userId) &&
    payload.userId > 0 &&
    (payload.role === "ADMIN" || payload.role === "STAFF")
  );
};

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication required.",
      });
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        message: "Authentication required.",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (!isAuthPayload(decoded)) {
      return res.status(401).json({
        message: "Invalid token.",
      });
    }

    req.user = decoded;

    return next();
  } catch {
    return res.status(401).json({
      message: "Invalid or expired token.",
    });
  }
};