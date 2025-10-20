import fs from "node:fs";
import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Router } from "express";
import multer from "multer";
import { createApiResponse } from "@/api-docs/openAPIResponseBuilders";
import requireAuth from "@/common/middleware/authMiddleware";
import { validateRequest } from "@/common/utils/httpHandlers";
import { registerBearerAuth } from "@/common/utils/openApiComponents";
import { storageController } from "./storageController";
import {
	GetStorageDetailRequestSchema,
	GetStorageDetailResponseSchema,
	GetStorageResponseSchema,
	UploadFileRequestSchema,
	UploadFileResponseSchema,
} from "./storageModel";

export const storageRegistry = new OpenAPIRegistry();
export const storageRouter: Router = express.Router();

storageRegistry.register("Upload File", UploadFileRequestSchema);

const bearerAuth = registerBearerAuth(storageRegistry);
const upload = multer({
	storage: multer.diskStorage({
		destination: (_req, _file, cb) => {
			const dir = "uploads";
			if (!fs.existsSync(dir)) {
				fs.mkdirSync(dir);
			}
			cb(null, dir);
		},
		filename: (_req, file, cb) => {
			cb(null, `${Date.now()}-${file.originalname}`);
		},
	}),
});

storageRegistry.registerPath({
	method: "get",
	path: "/api/my-storage",
	tags: ["Storage"],
	security: [{ [bearerAuth.name]: [] }],
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
storageRouter.get(
	"/:id",
	requireAuth,
	validateRequest(GetStorageDetailRequestSchema),
	storageController.getStorageDetail,
);

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
							file: { type: "string", format: "binary" },
						},
						required: ["file"],
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
	upload.single("file"),
	validateRequest(UploadFileRequestSchema),
	storageController.uploadFile,
);
