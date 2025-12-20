import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Router } from "express";
import { StatusCodes } from "http-status-codes";
import { validateRequest } from "@/common/utils/httpHandlers";
import { sharedController } from "./sharedController";
import { GetSharedRequestSchema } from "./sharedModel";

export const sharedRegistry = new OpenAPIRegistry();
export const sharedRouter: Router = express.Router();

// Get shared file or folder by token - returns binary download
sharedRegistry.registerPath({
	method: "get",
	path: "/shared/{token}",
	tags: ["Shared"],
	request: {
		params: GetSharedRequestSchema.shape.params,
		query: GetSharedRequestSchema.shape.query,
	},
	responses: {
		[StatusCodes.OK]: {
			description: "Success - Returns binary file or zip archive for folders",
			content: {
				"application/octet-stream": {
					schema: {
						type: "string",
						format: "binary",
						description: "File content as binary stream",
					},
				},
				"application/zip": {
					schema: {
						type: "string",
						format: "binary",
						description: "Folder content as zip archive",
					},
				},
			},
		},
		[StatusCodes.NOT_FOUND]: {
			description: "Link not found",
			content: {
				"application/json": {
					schema: {
						type: "object",
						properties: {
							message: { type: "string" },
							data: { type: "null" },
						},
					},
				},
			},
		},
		[StatusCodes.UNAUTHORIZED]: {
			description: "Invalid password",
			content: {
				"application/json": {
					schema: {
						type: "object",
						properties: {
							message: { type: "string" },
							data: { type: "null" },
						},
					},
				},
			},
		},
	},
});
// Render shared page (HTML)
sharedRouter.get("/:token", sharedController.renderSharedPage);

// Handle download (Form POST)
sharedRouter.post("/:token/download", sharedController.handleDownload);
