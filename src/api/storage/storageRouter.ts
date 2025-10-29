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
	DeleteFileRequestSchema,
	DeleteFileResponseSchema,
	DeleteFolderRequestSchema,
	DeleteFolderResponseSchema,
	DownloadFileRequestSchema,
	DownloadFileResponseSchema,
	GetStorageDetailRequestSchema,
	GetStorageDetailResponseSchema,
	GetStorageRequestSchema,
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
	request: {
		query: GetStorageRequestSchema.shape.query,
	},
	responses: createApiResponse(GetStorageResponseSchema, "Success"),
});
storageRouter.get("/", requireAuth, validateRequest(GetStorageRequestSchema), storageController.getStorage);

// Get user's folder and files on specific folder
storageRegistry.registerPath({
	method: "get",
	path: "/api/my-storage/{id}",
	tags: ["Storage"],
	security: [{ [bearerAuth.name]: [] }],
	request: {
		params: GetStorageDetailRequestSchema.shape.params,
		query: GetStorageDetailRequestSchema.shape.query,
	},
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

// Delete folder from user's storage
storageRegistry.registerPath({
	method: "delete",
	path: "/api/my-storage/folder/{id}",
	tags: ["Storage"],
	security: [{ [bearerAuth.name]: [] }],
	request: { params: DeleteFolderRequestSchema.shape.params },
	responses: createApiResponse(DeleteFolderResponseSchema, "Success"),
});
storageRouter.delete(
	"/folder/:id",
	requireAuth,
	validateRequest(DeleteFolderRequestSchema),
	storageController.deleteFolder,
);

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
					schema: {
						type: "object",
						properties: {
							folderId: { type: "string", format: "uuid" },
							files: {
								type: "array",
								items: { type: "string", format: "binary" },
							},
						},
						required: ["files"],
					},
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

// Delete file from user's storage
storageRegistry.registerPath({
	method: "delete",
	path: "/api/my-storage/file/{id}",
	tags: ["Storage"],
	security: [{ [bearerAuth.name]: [] }],
	request: { params: DeleteFileRequestSchema.shape.params },
	responses: createApiResponse(DeleteFileResponseSchema, "Success"),
});
storageRouter.delete("/file/:id", requireAuth, validateRequest(DeleteFileRequestSchema), storageController.deleteFile);

storageRegistry.registerPath({
	method: "get",
	path: "/api/my-storage/file/{id}",
	tags: ["Storage"],
	security: [{ [bearerAuth.name]: [] }],
	request: { params: DownloadFileRequestSchema.shape.params },
	responses: createApiResponse(DownloadFileResponseSchema, "Success"),
});
storageRouter.get("/file/:id", requireAuth, validateRequest(DownloadFileRequestSchema), storageController.downloadFile);
