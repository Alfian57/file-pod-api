import type { Request, RequestHandler, Response } from "express";
import { logger } from "@/server";
import { storageService } from "./storageService";

class StorageController {
	public getStorage: RequestHandler = async (req: Request, res: Response) => {
		const userId = req.user?.userId;
		if (!userId) return res.status(401).send({ message: "Unauthorized", data: null });
		const { sortBy, sortOrder } = req.query;
		const serviceResponse = await storageService.getStorage(
			userId,
			sortBy as "name" | "createdAt" | undefined,
			sortOrder as "asc" | "desc" | undefined,
		);
		res.status(serviceResponse.statusCode).send(serviceResponse);
	};

	public getStorageDetail: RequestHandler = async (req: Request, res: Response) => {
		const userId = req.user?.userId;
		if (!userId) return res.status(401).send({ message: "Unauthorized", data: null });
		const { id } = req.params;
		const { sortBy, sortOrder } = req.query;
		const serviceResponse = await storageService.getStorageDetail(
			id,
			sortBy as "name" | "createdAt" | undefined,
			sortOrder as "asc" | "desc" | undefined,
		);
		res.status(serviceResponse.statusCode).send(serviceResponse);
	};

	public createFolder: RequestHandler = async (req: Request, res: Response) => {
		const userId = req.user?.userId;
		if (!userId) return res.status(401).send({ message: "Unauthorized", data: null });
		const { name, parentFolderId } = req.body;

		const serviceResponse = await storageService.createFolder(userId, name, parentFolderId);
		return res.status(serviceResponse.statusCode).send(serviceResponse);
	};

	public deleteFolder: RequestHandler = async (req: Request, res: Response) => {
		const userId = req.user?.userId;
		if (!userId) return res.status(401).send({ message: "Unauthorized", data: null });
		const { id } = req.params;

		const serviceResponse = await storageService.deleteFolder(id);
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

	public deleteFile: RequestHandler = async (req: Request, res: Response) => {
		const userId = req.user?.userId;
		if (!userId) return res.status(401).send({ message: "Unauthorized", data: null });
		const { id } = req.params;

		const serviceResponse = await storageService.deleteFile(id);
		return res.status(serviceResponse.statusCode).send(serviceResponse);
	};

	public downloadFile: RequestHandler = async (req: Request, res: Response) => {
		const userId = req.user?.userId;
		if (!userId) return res.status(401).send({ message: "Unauthorized", data: null });
		const { id } = req.params;

		const serviceResponse = await storageService.downloadFile(id);
		if (serviceResponse.statusCode !== 200 || !serviceResponse.data) {
			return res.status(serviceResponse.statusCode).send(serviceResponse);
		}

		const { stream, filename, contentType } = serviceResponse.data;

		res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
		res.setHeader("Content-Type", contentType);

		stream.pipe(res);

		stream.on("error", (err: { message: string }) => {
			logger.error(`Stream error for file ${id}: ${err.message}`);
			if (!res.headersSent) {
				res.status(500).send({ message: "Error streaming file" });
			}
		});
	};

	public shareFile: RequestHandler = async (req: Request, res: Response) => {
		const userId = req.user?.userId;
		if (!userId) return res.status(401).send({ message: "Unauthorized", data: null });
		const { id } = req.params;
		const { password } = req.body;

		const serviceResponse = await storageService.shareFile(userId, id, password);
		return res.status(serviceResponse.statusCode).send(serviceResponse);
	};

	public shareFolder: RequestHandler = async (req: Request, res: Response) => {
		const userId = req.user?.userId;
		if (!userId) return res.status(401).send({ message: "Unauthorized", data: null });
		const { id } = req.params;
		const { password } = req.body;

		const serviceResponse = await storageService.shareFolder(userId, id, password);
		return res.status(serviceResponse.statusCode).send(serviceResponse);
	};
}

export const storageController = new StorageController();
