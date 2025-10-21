import type { Request, RequestHandler, Response } from "express";
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

	public createFolder: RequestHandler = async (req: Request, res: Response) => {
		const userId = req.user?.userId;
		if (!userId) return res.status(401).send({ message: "Unauthorized", data: null });
		const { name, parentFolderId } = req.body;

		const serviceResponse = await storageService.createFolder(userId, name, parentFolderId);
		return res.status(serviceResponse.statusCode).send(serviceResponse);
	};

	public uploadFile: RequestHandler = async (req: Request, res: Response) => {
		const userId = req.user?.userId;
		if (!userId) return res.status(401).send({ message: "Unauthorized", data: null });
		const { folderId } = req.body;
		const files = req.files;

		if (!files) {
			logger.error(`No file uploaded by user ${userId}`);
			return res.status(400).send({ message: "No file uploaded", data: null });
		}

		const fileArray = (Array.isArray(files) ? files : [files]) as Express.Multer.File[];

		const svcResponse = await storageService.uploadFile(userId, folderId, fileArray);
		return res.status(svcResponse.statusCode ?? 500).send(svcResponse);
	};
}

export const storageController = new StorageController();
