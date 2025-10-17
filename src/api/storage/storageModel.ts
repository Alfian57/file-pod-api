import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

export const FileSummarySchema = z.object({ id: z.string(), name: z.string(), sizeBytes: z.bigint().nullable() });
export type FileSummary = z.infer<typeof FileSummarySchema>;

export const FolderSummarySchema = z.object({ id: z.string(), name: z.string() });
export type FolderSummary = z.infer<typeof FolderSummarySchema>;

export const RootStorageSchema = z.object({ folders: z.array(FolderSummarySchema), files: z.array(FileSummarySchema) });
export type RootStorage = z.infer<typeof RootStorageSchema>;

export const GetStorageDetailRequestSchema = z.object({
	params: z.object({ id: z.string().uuid() }),
});

export const GetStorageResponseSchema = z.object({
	folders: z.array(FolderSummarySchema),
	files: z.array(FileSummarySchema),
});

export const GetStorageDetailResponseSchema = z.object({
	folder: z.object({ id: z.string(), name: z.string() }).nullable(),
});
