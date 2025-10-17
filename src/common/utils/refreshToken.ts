import crypto from "node:crypto";
import ms from "ms";
import { env } from "./envConfig";

export function generateRefreshToken(): string {
	return crypto.randomBytes(64).toString("hex");
}

export function getRefreshTokenExpiryDate(): Date {
	const durationMs = ms(env.REFRESH_TOKEN_EXPIRES_IN as unknown as ms.StringValue);
	if (typeof durationMs !== "number") {
		throw new Error(`Invalid REFRESH_TOKEN_EXPIRES_IN format: ${env.REFRESH_TOKEN_EXPIRES_IN}`);
	}
	return new Date(Date.now() + durationMs);
}
