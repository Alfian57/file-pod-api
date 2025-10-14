import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Router } from "express";
import { LoginRequestSchema, RegisterRequestSchema, LoginResponseSchema, RegisterResponseDataSchema, RefreshTokenRequestSchema, RefreshTokenResponseSchema } from "./authModel";
import { createApiResponse } from "@/api-docs/openAPIResponseBuilders";
import { validateRequest } from "@/common/utils/httpHandlers";
import { authController } from "./authController";
import { registerBearerAuth } from "@/common/utils/openApiComponents";
import { storageRegistry } from "../storage/storageRouter";
import requireAuth from "@/common/middleware/authMiddleware";

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
