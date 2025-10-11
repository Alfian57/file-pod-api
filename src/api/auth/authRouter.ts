import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Router } from "express";
import { LoginRequestSchema, RegisterRequestSchema, LoginResponseSchema, RegisterResponseDataSchema } from "./authModel";
import { createApiResponse } from "@/api-docs/openAPIResponseBuilders";
import { validateRequest } from "@/common/utils/httpHandlers";
import { authController } from "./authController";

export const authRegistry = new OpenAPIRegistry();
export const authRouter: Router = express.Router();

authRegistry.register("Login", LoginRequestSchema);
authRegistry.register("Register", RegisterRequestSchema);

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
