import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

// Shared file representation
export const SharedFileSchema = z.object({
	id: z.string().uuid().openapi({ description: "File id" }),
	originalName: z.string().openapi({ description: "Original filename" }),
	filename: z.string().openapi({ description: "Internal stored filename (object name)" }),
	mimeType: z.string().nullable().openapi({ description: "MIME type" }),
});
export type SharedFile = z.infer<typeof SharedFileSchema>;

// Shared folder representation
export const SharedFolderSchema = z.object({
	id: z.string().uuid().openapi({ description: "Folder id" }),
	name: z.string().openapi({ description: "Folder name" }),
});
export type SharedFolder = z.infer<typeof SharedFolderSchema>;

// Request schema for public shared link
export const GetSharedRequestSchema = z.object({
	params: z.object({ token: z.string().openapi({ description: "Share token" }) }),
	query: z.object({ password: z.string().optional() }),
});
export type GetSharedRequest = z.infer<typeof GetSharedRequestSchema>;

// Response schema for OpenAPI (binary download)
export const GetSharedDownloadResponseSchema = z.object({
	file: z.any().openapi({
		type: "string",
		format: "binary",
		description: "File or folder content as binary stream (zip for folders)",
	}),
});
export type GetSharedDownloadResponse = z.infer<typeof GetSharedDownloadResponseSchema>;

// Response when shared target is a file (for service layer)
export const GetSharedFileResponseSchema = z.object({
	type: z.literal("file"),
	file: SharedFileSchema,
});

// Response when shared target is a folder (for service layer)
export const GetSharedFolderResponseSchema = z.object({
	type: z.literal("folder"),
	folder: SharedFolderSchema,
	files: z.array(SharedFileSchema),
});

// Discriminated union for possible responses (for service layer)
export const GetSharedResponseSchema = z.discriminatedUnion("type", [
	GetSharedFileResponseSchema,
	GetSharedFolderResponseSchema,
]);
export type GetSharedResponse = z.infer<typeof GetSharedResponseSchema>;

// Generic error response (reuse existing ServiceResponse wrapper in runtime)
export const SharedErrorResponseSchema = z.object({ message: z.string(), data: z.null() });

// Type definitions for internal use
export type SharedFilePayload = {
	type: "file";
	file: { id: string; originalName: string; filename: string; mimeType: string | null };
};

export type SharedFolderPayload = {
	type: "folder";
	folder: { id: string; name: string };
	files: Array<{ id: string; originalName: string; filename: string; mimeType: string | null }>;
};
