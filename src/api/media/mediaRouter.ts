import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Router } from "express";
import { z } from "zod";

import { createApiResponse } from "@/api-docs/openAPIResponseBuilders";
import { mediaController } from "./mediaController";

export const mediaRegistry = new OpenAPIRegistry();
export const mediaRouter: Router = express.Router();

mediaRegistry.registerPath({
	method: "get",
	path: "/media/{filePath}",
	tags: ["Media"],
	request: {
		params: z.object({
			filePath: z.string(),
		}),
	},
	responses: createApiResponse(z.any(), "Success"),
});

// Use a wildcard to capture nested paths like user-id/filename.jpg
mediaRouter.get(/\/(.*)/, mediaController.getMedia);
