import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Router } from "express";
import { createApiResponse } from "@/api-docs/openAPIResponseBuilders";
import { multerUpload } from "@/common/lib/multer";
import requireAuth from "@/common/middleware/authMiddleware";
import { validateRequest } from "@/common/utils/httpHandlers";
import { registerBearerAuth } from "@/common/utils/openApiComponents";
import { storageController } from "./storageController";
import {
	CreateFolderRequestSchema,
	CreateFolderResponseSchema,
	GetStorageDetailRequestSchema,
	GetStorageDetailResponseSchema,
	GetStorageResponseSchema,
	UploadFileRequestSchema,
	UploadFileResponseSchema,
} from "./storageModel";

export const storageRegistry = new OpenAPIRegistry();
export const storageRouter: Router = express.Router();

// Register schemas
storageRegistry.register("Upload File Request", UploadFileRequestSchema);
storageRegistry.register("Create Folder Request", CreateFolderRequestSchema);
storageRegistry.register("Get Storage Response", GetStorageResponseSchema);
storageRegistry.register("Get Storage Detail Response", GetStorageDetailResponseSchema);

// Bearer Auth
const bearerAuth = registerBearerAuth(storageRegistry);

// Get user's folder and files on root path
storageRegistry.registerPath({
	method: "get",
	path: "/api/my-storage",
	tags: ["Storage"],
	security: [{ [bearerAuth.name]: [] }],
	responses: createApiResponse(GetStorageResponseSchema, "Success"),
});
storageRouter.get("/", requireAuth, storageController.getStorage);

// Get user's folder and files on specific folder
storageRegistry.registerPath({
	method: "get",
	path: "/api/my-storage/:id",
	tags: ["Storage"],
	security: [{ [bearerAuth.name]: [] }],
	request: { params: GetStorageDetailRequestSchema.shape.params },
	responses: createApiResponse(GetStorageDetailResponseSchema, "Success"),
});
storageRouter.get(
	"/:id",
	requireAuth,
	validateRequest(GetStorageDetailRequestSchema),
	storageController.getStorageDetail,
);

// Create new folder in user's storage
storageRegistry.registerPath({
	method: "post",
	path: "/api/my-storage/folder",
	tags: ["Storage"],
	security: [{ [bearerAuth.name]: [] }],
	request: { body: { content: { "application/json": { schema: CreateFolderRequestSchema.shape.body } } } },
	responses: createApiResponse(CreateFolderResponseSchema, "Success"),
});
storageRouter.post("/folder", requireAuth, validateRequest(CreateFolderRequestSchema), storageController.createFolder);

// Upload file to user's storage
storageRegistry.registerPath({
	method: "post",
	path: "/api/my-storage/upload",
	tags: ["Storage"],
	security: [{ [bearerAuth.name]: [] }],
	request: {
		body: {
			content: {
				"multipart/form-data": {
					schema: UploadFileRequestSchema,
				},
			},
		},
	},
	responses: createApiResponse(UploadFileResponseSchema, "Success"),
});
storageRouter.post(
	"/upload",
	requireAuth,
	multerUpload.array("files"),
	validateRequest(UploadFileRequestSchema),
	storageController.uploadFile,
);
