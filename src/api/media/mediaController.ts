import type { Request, RequestHandler, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { minioClient } from "@/common/lib/minio";
import { env } from "@/common/utils/envConfig";
import { logger } from "@/server";

class MediaController {
	public getMedia: RequestHandler = async (req: Request, res: Response) => {
		const filePath = req.params[0]; // Capture the wildcard path matches from RegExp

		if (!filePath) {
			return res.status(StatusCodes.BAD_REQUEST).json({ message: "File path is required" });
		}

		try {
			// Check if object exists and get metadata
			const stat = await minioClient.statObject(env.MINIO_BUCKET_NAME, filePath);
			const fileSize = stat.size;
			const range = req.headers.range;

			if (stat.metaData && stat.metaData["content-type"]) {
				res.setHeader("Content-Type", stat.metaData["content-type"]);
			}

			if (range) {
				const parts = range.replace(/bytes=/, "").split("-");
				const start = Number.parseInt(parts[0], 10);
				const end = parts[1] ? Number.parseInt(parts[1], 10) : fileSize - 1;
				const chunksize = end - start + 1;

				res.status(StatusCodes.PARTIAL_CONTENT);
				res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
				res.setHeader("Accept-Ranges", "bytes");
				res.setHeader("Content-Length", chunksize);

				const dataStream = await minioClient.getPartialObject(env.MINIO_BUCKET_NAME, filePath, start, chunksize);
				dataStream.pipe(res);

				dataStream.on("error", (err) => {
					logger.error(`Error streaming file chunk ${filePath}: ${err.message}`);
					// Can't send error json if headers already sent
				});
			} else {
				res.setHeader("Content-Length", fileSize);
				res.setHeader("Accept-Ranges", "bytes");

				const dataStream = await minioClient.getObject(env.MINIO_BUCKET_NAME, filePath);
				dataStream.pipe(res);

				dataStream.on("error", (err) => {
					logger.error(`Error streaming file ${filePath}: ${err.message}`);
					if (!res.headersSent) {
						res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Error streaming file" });
					}
				});
			}
		} catch (error) {
			logger.error(`Error fetching media ${filePath}: ${(error as Error).message}`);
			if (!res.headersSent) {
				return res.status(StatusCodes.NOT_FOUND).json({ message: "File not found" });
			}
		}
	};
}

export const mediaController = new MediaController();
