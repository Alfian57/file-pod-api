import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Router } from "express";
import { createApiResponse } from "@/api-docs/openAPIResponseBuilders";
import { validateRequest } from "@/common/utils/httpHandlers";
import requireAuth from "@/common/middleware/authMiddleware";
import { storageController } from "./storageController";
import { GetStorageDetailRequestSchema, GetStorageDetailResponseSchema, GetStorageResponseSchema } from "./storageModel";
import { registerBearerAuth } from "@/common/utils/openApiComponents";

export const storageRegistry = new OpenAPIRegistry();
export const storageRouter: Router = express.Router();

const bearerAuth = registerBearerAuth(storageRegistry);

storageRegistry.registerPath({
    method: "get",
    path: "/api/my-storage",
    tags: ["Storage"],
    security: [{ [bearerAuth.name]: [] }],
    request: {},
    responses: createApiResponse(GetStorageResponseSchema, "Success"),
});
storageRouter.get("/", requireAuth, storageController.getStorage);

storageRegistry.registerPath({
    method: "get",
    path: "/api/my-storage/:id",
    tags: ["Storage"],
    security: [{ [bearerAuth.name]: [] }],
    request: { params: GetStorageDetailRequestSchema.shape.params },
    responses: createApiResponse(GetStorageDetailResponseSchema, "Success"),
});
storageRouter.get("/:id", requireAuth, validateRequest(GetStorageDetailRequestSchema), storageController.getStorageDetail);
