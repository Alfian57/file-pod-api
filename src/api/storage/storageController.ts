import type { Request, RequestHandler, Response } from "express";

import { storageService } from "./storageService";

class StorageController {
	public getStorage: RequestHandler = async (req: Request, res: Response) => {
		const userId = req.user?.userId;
		if (!userId) return res.status(401).send({ success: false, message: "Unauthorized", data: null, statusCode: 401 });
		const serviceResponse = await storageService.getStorage(userId);
		res.status(serviceResponse.statusCode).send(serviceResponse);
	};

	public getStorageDetail: RequestHandler = async (req: Request, res: Response) => {
		const userId = req.user?.userId;
		if (!userId) return res.status(401).send({ success: false, message: "Unauthorized", data: null, statusCode: 401 });
		const { id } = req.params;
		const serviceResponse = await storageService.getStorageDetail(id);
		res.status(serviceResponse.statusCode).send(serviceResponse);
	};
}

export const storageController = new StorageController();
