import { saveBufferToUploads } from "@/common/utils/fileUploader";
import { logger } from "@/server";

export async function saveMulterFile(file?: Express.Multer.File) {
	if (!file) throw new Error("file is required");

	try {
		const saved = await saveBufferToUploads(file.buffer, file.originalname || "file");
		return saved; // { finalName, outPath, size }
	} catch (ex) {
		if (ex instanceof Error) logger.error(`UploaderService error: ${ex.message}\n${ex.stack}`);
		else logger.error(`UploaderService error: ${String(ex)}`);
		throw ex;
	}
}

export function normalizeFolderId(rawFolderId: unknown): string | null {
	return rawFolderId === "" || rawFolderId === "null" || rawFolderId === null || typeof rawFolderId === "undefined"
		? null
		: String(rawFolderId);
}
