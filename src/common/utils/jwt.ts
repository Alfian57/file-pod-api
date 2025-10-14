import jwt from "jsonwebtoken";
import { env } from "./envConfig";

export function signJwt(payload: object) {
	return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

export function verifyJwt<T = any>(token: string): T | null {
	try {
		return jwt.verify(token, env.JWT_SECRET) as T;
	} catch (e) {
		return null;
	}
}
