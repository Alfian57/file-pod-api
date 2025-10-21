import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

// General file response schemas
export const FileSummarySchema = z.object({
	id: z.string(),
	originalName: z.string(),
	filename: z.string(),
	mimeType: z.string(),
	sizeBytes: z.string().nullable(),
	createdAt: z.string(),
});
export type FileSummary = z.infer<typeof FileSummarySchema>;

// General foldedr response schemas
export const FolderSummarySchema = z.object({ id: z.string(), name: z.string(), createdAt: z.string() });
export type FolderSummary = z.infer<typeof FolderSummarySchema>;

// Get Storage
export const GetStorageResponseSchema = z.object({
	folders: z.array(FolderSummarySchema),
	files: z.array(FileSummarySchema),
});
export type GetStorageResponseData = z.infer<typeof GetStorageResponseSchema>;

// Get Storage Detail
export const GetStorageDetailRequestSchema = z.object({
	params: z.object({ id: z.string().uuid() }),
});
export const GetStorageDetailResponseSchema = z.object({
	folders: z.array(FolderSummarySchema),
	files: z.array(FileSummarySchema),
});
export type GetStorageDetailResponseData = z.infer<typeof GetStorageDetailResponseSchema>;

// Create Folder
export const CreateFolderOpenApiSchema = {
	type: "object",
	properties: {
		folderId: { type: "string", format: "uuid" },
		files: {
			type: "array",
			items: { type: "string", format: "binary" },
		},
	},
	required: ["files"],
};
export const CreateFolderRequestSchema = z.object({
	body: z.object({
		name: z.string().min(1, "Folder name is required"),
		parentFolderId: z.preprocess((v) => {
			if (v === "" || v === "null" || v === null || typeof v === "undefined") return null;
			return v;
		}, z.string().uuid().nullable()),
	}),
});
export const CreateFolderResponseSchema = z.null();
export type CreateFolderResponseData = z.infer<typeof CreateFolderResponseSchema>;

// Upload File
export const UploadFileRequestSchema = z.object({
	body: z.object({
		folderId: z.preprocess((v) => {
			if (v === "" || v === "null" || v === null || typeof v === "undefined") return null;
			return v;
		}, z.string().uuid().nullable()),
	}),
});
export const UploadFileResponseSchema = z.null();
export type UploadFileResponseData = z.infer<typeof UploadFileResponseSchema>;
