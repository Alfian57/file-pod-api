import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Router } from "express";
import { z } from "zod";
import { LoginSchema, RegisterSchema } from "./authModel";
import { createApiResponse } from "@/api-docs/openAPIResponseBuilders";
import { validateRequest } from "@/common/utils/httpHandlers";
import { authController } from "./authController";

export const authRegistry = new OpenAPIRegistry();
export const authRouter: Router = express.Router();

authRegistry.register("Login", LoginSchema);
authRegistry.register("Register", RegisterSchema);

authRegistry.registerPath({
    method: "post",
    path: "/login",
    tags: ["User"],
    request: { body: { content: { "application/json": { schema: LoginSchema.shape.body } } } },
    responses: createApiResponse(z.object({ token: z.string() }), "Success"),
});
authRouter.post("/login", validateRequest(LoginSchema), authController.login);

authRegistry.registerPath({
    method: "post",
    path: "/register",
    tags: ["User"],
    request: { body: { content: { "application/json": { schema: RegisterSchema.shape.body } } } },
    responses: createApiResponse(z.object({ token: z.string() }), "Success"),
});
authRouter.post("/register", validateRequest(RegisterSchema), authController.register);
