import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

// General response schemas
export const FileSummarySchema = z.object({
	id: z.string(),
	name: z.string(),
	mimeType: z.string(),
	sizeBytes: z.string().nullable(),
	createdAt: z.string(),
});
export type FileSummary = z.infer<typeof FileSummarySchema>;

export const FolderSummarySchema = z.object({ id: z.string(), name: z.string(), createdAt: z.string() });
export type FolderSummary = z.infer<typeof FolderSummarySchema>;

export const RootStorageSchema = z.object({ folders: z.array(FolderSummarySchema), files: z.array(FileSummarySchema) });
export type RootStorage = z.infer<typeof RootStorageSchema>;

// Get Storage
export const GetStorageResponseSchema = z.object({
	folders: z.array(FolderSummarySchema),
	files: z.array(FileSummarySchema),
});

// Get Storage Detail
export const GetStorageDetailRequestSchema = z.object({
	params: z.object({ id: z.string().uuid() }),
});
export const GetStorageDetailResponseSchema = z.object({
	folder: z.object({ id: z.string(), name: z.string() }).nullable(),
});

// Upload File
export const UploadFileRequestSchema = z.object({
	body: z.object({
		folderId: z.preprocess((v) => {
			if (v === "" || v === "null" || v === null || typeof v === "undefined") return null;
			return v;
		}, z.string().uuid().nullable()),
	}),
});
export const UploadFileResponseSchema = z.object({
	id: z.string(),
	userId: z.string(),
	folderId: z.string().nullable(),
	name: z.string(),
	mimeType: z.string(),
	sizeBytes: z.string(),
});
export type UploadFileResponseData = z.infer<typeof UploadFileResponseSchema>;
