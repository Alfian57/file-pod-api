import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Router } from "express";
import { createApiResponse } from "@/api-docs/openAPIResponseBuilders";
import requireAuth from "@/common/middleware/authMiddleware";
import { validateRequest } from "@/common/utils/httpHandlers";
import { registerBearerAuth } from "@/common/utils/openApiComponents";
import { storageRegistry } from "../storage/storageRouter";
import { authController } from "./authController";
import {
<<<<<<< HEAD
=======
	GetCurrentUserRequestSchema,
	GetCurrentUserResponseSchema,
>>>>>>> 02fa84f (feat: get user feature)
	LoginRequestSchema,
	LoginResponseSchema,
	LogoutRequestSchema,
	LogoutResponseDataSchema,
	RefreshTokenRequestSchema,
	RefreshTokenResponseSchema,
	RegisterRequestSchema,
	RegisterResponseDataSchema,
} from "./authModel";

export const authRegistry = new OpenAPIRegistry();
export const authRouter: Router = express.Router();

authRegistry.register("Login", LoginRequestSchema);
authRegistry.register("Register", RegisterRequestSchema);
authRegistry.register("Refresh Token", RefreshTokenRequestSchema);

const bearerAuth = registerBearerAuth(storageRegistry);

authRegistry.registerPath({
	method: "post",
	path: "/api/auth/login",
	tags: ["Auth"],
	request: { body: { content: { "application/json": { schema: LoginRequestSchema.shape.body } } } },
	responses: createApiResponse(LoginResponseSchema, "Success"),
});
authRouter.post("/login", validateRequest(LoginRequestSchema), authController.login);

authRegistry.registerPath({
	method: "post",
	path: "/api/auth/register",
	tags: ["Auth"],
	request: { body: { content: { "application/json": { schema: RegisterRequestSchema.shape.body } } } },
	responses: createApiResponse(RegisterResponseDataSchema, "Created", 201),
});
authRouter.post("/register", validateRequest(RegisterRequestSchema), authController.register);

authRegistry.registerPath({
	method: "post",
	path: "/api/auth/refresh-token",
	tags: ["Auth"],
	security: [{ [bearerAuth.name]: [] }],
	request: { body: { content: { "application/json": { schema: RefreshTokenRequestSchema.shape.body } } } },
	responses: createApiResponse(RefreshTokenResponseSchema, "Success", 200),
});
authRouter.post("/refresh-token", requireAuth, validateRequest(RefreshTokenRequestSchema), authController.refreshToken);

authRegistry.registerPath({
	method: "post",
	path: "/api/auth/logout",
	tags: ["Auth"],
	security: [{ [bearerAuth.name]: [] }],
	request: { body: { content: { "application/json": { schema: LogoutRequestSchema.shape.body } } } },
	responses: createApiResponse(LogoutResponseDataSchema, "Success", 200),
});
authRouter.post("/logout", requireAuth, validateRequest(LogoutRequestSchema), authController.logout);

authRegistry.registerPath({
	method: "post",
	path: "/api/auth/user",
	tags: ["Auth"],
	security: [{ [bearerAuth.name]: [] }],
	request: { body: { content: { "application/json": { schema: GetCurrentUserRequestSchema.shape.body } } } },
	responses: createApiResponse(GetCurrentUserResponseSchema, "Success", 200),
});
authRouter.post("/user", requireAuth, validateRequest(GetCurrentUserRequestSchema), authController.getCurrentUser);
