import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { ServiceResponse } from "@/common/models/serviceResponse";
import { verifyJwt } from "@/common/utils/jwt";

declare global {
	namespace Express {
		interface Request {
			user?: { userId: string; email?: string };
		}
	}
}

export default function requireAuth(req: Request, res: Response, next: NextFunction) {
	const authHeader = req.headers.authorization;
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		const sr = ServiceResponse.failure("Missing or invalid Authorization header", null, StatusCodes.UNAUTHORIZED);
		return res.status(sr.statusCode).send(sr);
	}

	const token = authHeader.replace(/^Bearer\s+/i, "");
	const payload = verifyJwt<{ userId: string; email?: string }>(token);
	if (!payload || !payload.userId) {
		const sr = ServiceResponse.failure("Invalid or expired token", null, StatusCodes.UNAUTHORIZED);
		return res.status(sr.statusCode).send(sr);
	}

	req.user = { userId: payload.userId, email: payload.email };
	return next();
}
