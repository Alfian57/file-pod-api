import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
	NODE_ENV: z.enum(["development", "production", "test"]).default("production"),
	HOST: z.string().min(1).default("localhost"),
	PORT: z.coerce.number().int().positive().default(8080),

	CORS_ORIGIN: z.string().url().default("http://localhost:8080"),
	APP_URL: z.string().url().default("http://localhost:8080"),

	COMMON_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(1000),
	COMMON_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(1000),

	JWT_SECRET: z.string().min(10, "JWT secret is required and should be a reasonably long string"),
	JWT_EXPIRES_IN: z.string().default("15m"),
	REFRESH_TOKEN_EXPIRES_IN: z.string().default("7d"),

	MINIO_ENDPOINT: z.string().min(1).default("localhost"),
	MINIO_PORT: z.coerce.number().int().positive().default(9000),
	MINIO_ACCESS_KEY: z.string().min(1).default("minioadmin"),
	MINIO_SECRET_KEY: z.string().min(1).default("minioadmin"),
	MINIO_USE_SSL: z.preprocess((val) => {
		if (typeof val === "string") {
			const lowered = val.trim().toLowerCase();
			if (lowered === "true") return true;
			if (lowered === "false") return false;
		}
		return val;
	}, z.boolean().default(false)),
	MINIO_BUCKET_NAME: z.string().min(1).default("file-pod-bucket"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
	console.error("❌ Invalid environment variables:", parsedEnv.error.format());
	throw new Error("Invalid environment variables");
}

export const env = {
	...parsedEnv.data,
	// provide defaults when not set (useful for tests/dev)
	JWT_SECRET: parsedEnv.data.JWT_SECRET ?? "dev-secret-change-me",
	isDevelopment: parsedEnv.data.NODE_ENV === "development",
	isProduction: parsedEnv.data.NODE_ENV === "production",
	isTest: parsedEnv.data.NODE_ENV === "test",
};
