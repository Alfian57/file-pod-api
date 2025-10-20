import type { Request, RequestHandler, Response } from "express";
import { normalizeFolderId, saveMulterFile } from "@/common/services/uploaderService";
import { logger } from "@/server";
import { storageService } from "./storageService";

class StorageController {
	public getStorage: RequestHandler = async (req: Request, res: Response) => {
		const userId = req.user?.userId;
		if (!userId) return res.status(401).send({ message: "Unauthorized", data: null });
		const serviceResponse = await storageService.getStorage(userId);
		res.status(serviceResponse.statusCode).send(serviceResponse);
	};

	public getStorageDetail: RequestHandler = async (req: Request, res: Response) => {
		const userId = req.user?.userId;
		if (!userId) return res.status(401).send({ message: "Unauthorized", data: null });
		const { id } = req.params;
		const serviceResponse = await storageService.getStorageDetail(id);
		res.status(serviceResponse.statusCode).send(serviceResponse);
	};

	public uploadFile: RequestHandler = async (req: Request, res: Response) => {
		const userId = req.user?.userId;
		if (!userId) return res.status(401).send({ message: "Unauthorized", data: null });

		const fileObj = (req as unknown as { file?: Express.Multer.File }).file;
		const rawFolderId = (req.body as { folderId?: string | null }).folderId;

		try {
			const saved = await saveMulterFile(fileObj);

			const folderId = normalizeFolderId(rawFolderId);
			const svcResponse = await storageService.uploadFile(
				String(userId),
				folderId,
				saved.finalName,
				fileObj?.mimetype || "application/octet-stream",
				saved.size,
			);
			return res.status(svcResponse.statusCode ?? 500).send(svcResponse);
		} catch (ex) {
			if (ex instanceof Error) {
				logger.error(`Upload error: ${ex.message}\n${ex.stack}`);
			} else {
				logger.error(`Upload error: ${String(ex)}`);
			}

			return res.status(500).send({ message: "An error occurred uploading file", data: null });
		}
	};
}

export const storageController = new StorageController();
