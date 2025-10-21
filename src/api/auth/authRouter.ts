import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Router } from "express";
import { createApiResponse } from "@/api-docs/openAPIResponseBuilders";
import requireAuth from "@/common/middleware/authMiddleware";
import { validateRequest } from "@/common/utils/httpHandlers";
import { registerBearerAuth } from "@/common/utils/openApiComponents";
import { storageRegistry } from "../storage/storageRouter";
import { authController } from "./authController";
import {
	GetCurrentUserResponseSchema,
	LoginRequestSchema,
	LoginResponseSchema,
	LogoutRequestSchema,
	LogoutResponseSchema,
	RefreshTokenRequestSchema,
	RefreshTokenResponseSchema,
	RegisterRequestSchema,
	RegisterResponseSchema,
} from "./authModel";

export const authRegistry = new OpenAPIRegistry();
export const authRouter: Router = express.Router();

// Register schemas
authRegistry.register("Login Request", LoginRequestSchema);
authRegistry.register("Register Request", RegisterRequestSchema);
authRegistry.register("Refresh Token Request", RefreshTokenRequestSchema);
authRegistry.register("Login Response", LoginResponseSchema);
authRegistry.register("Register Response", RegisterResponseSchema);
authRegistry.register("Get Current User Response", GetCurrentUserResponseSchema);

// Bearer Auth
const bearerAuth = registerBearerAuth(storageRegistry);

// Login with email and password
authRegistry.registerPath({
	method: "post",
	path: "/api/auth/login",
	tags: ["Auth"],
	request: { body: { content: { "application/json": { schema: LoginRequestSchema.shape.body } } } },
	responses: createApiResponse(LoginResponseSchema, "Success"),
});
authRouter.post("/login", validateRequest(LoginRequestSchema), authController.login);

// Register a new user
authRegistry.registerPath({
	method: "post",
	path: "/api/auth/register",
	tags: ["Auth"],
	request: { body: { content: { "application/json": { schema: RegisterRequestSchema.shape.body } } } },
	responses: createApiResponse(RegisterResponseSchema, "Created", 201),
});
authRouter.post("/register", validateRequest(RegisterRequestSchema), authController.register);

// Refresh access token
authRegistry.registerPath({
	method: "post",
	path: "/api/auth/refresh-token",
	tags: ["Auth"],
	security: [{ [bearerAuth.name]: [] }],
	request: { body: { content: { "application/json": { schema: RefreshTokenRequestSchema.shape.body } } } },
	responses: createApiResponse(RefreshTokenResponseSchema, "Success", 200),
});
authRouter.post("/refresh-token", requireAuth, validateRequest(RefreshTokenRequestSchema), authController.refreshToken);

// Logout user
authRegistry.registerPath({
	method: "post",
	path: "/api/auth/logout",
	tags: ["Auth"],
	security: [{ [bearerAuth.name]: [] }],
	request: { body: { content: { "application/json": { schema: LogoutRequestSchema.shape.body } } } },
	responses: createApiResponse(LogoutResponseSchema, "Success", 200),
});
authRouter.post("/logout", requireAuth, validateRequest(LogoutRequestSchema), authController.logout);

// Get current authenticated user
authRegistry.registerPath({
	method: "post",
	path: "/api/auth/user",
	tags: ["Auth"],
	security: [{ [bearerAuth.name]: [] }],
	responses: createApiResponse(GetCurrentUserResponseSchema, "Success", 200),
});
authRouter.post("/user", requireAuth, authController.getCurrentUser);
