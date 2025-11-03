import type { Readable } from "node:stream";
import archiver from "archiver";
import type { Request, RequestHandler, Response } from "express";
import { logger } from "@/server";
import type { SharedFilePayload, SharedFolderPayload } from "./sharedModel";
import { sharedService } from "./sharedService";

class SharedController {
	public downloadByToken: RequestHandler = async (req: Request, res: Response) => {
		const { token } = req.params as { token: string };
		const providedPassword = (req.query.password as string) || (req.headers["x-share-password"] as string | undefined);

		const svc = await sharedService.getSharedLink(token, providedPassword);
		if (svc.statusCode !== 200 || !svc.data) {
			return res.status(svc.statusCode).send({ message: svc.message ?? "Error", data: svc.data ?? null });
		}

		const payload = svc.data as SharedFilePayload | SharedFolderPayload;
		try {
			if (payload.type === "file") {
				const file = payload.file;
				const objectStream = await sharedService.getObjectStream(file.filename);

				res.setHeader("Content-Disposition", `attachment; filename="${file.originalName}"`);
				res.setHeader("Content-Type", file.mimeType || "application/octet-stream");

				objectStream.pipe(res);

				objectStream.on("error", (err: Error) => {
					logger.error(`Stream error for shared file ${file.id}: ${err.message}`);
					if (!res.headersSent) res.status(500).send({ message: "Error streaming file" });
				});
				return;
			}

			if (payload.type === "folder") {
				const folder = payload.folder;
				const files: Array<{ id: string; originalName: string; filename: string }> = payload.files || [];

				res.setHeader("Content-Disposition", `attachment; filename="${folder.name}.zip"`);
				res.setHeader("Content-Type", "application/zip");

				const archive = archiver("zip", { zlib: { level: 9 } });
				archive.on("error", (err: Error) => {
					logger.error(`Archive error: ${err.message}`);
					if (!res.headersSent) res.status(500).send({ message: "Error creating zip" });
				});

				archive.pipe(res);

				// sequentially append files to the archive
				for (const f of files) {
					try {
						const objectStream: Readable = await sharedService.getObjectStream(f.filename);
						archive.append(objectStream, { name: f.originalName });
					} catch (err: unknown) {
						const msg = err instanceof Error ? err.message : String(err);
						logger.error(`Error fetching object ${f.filename}: ${msg}`);
						// continue with next files instead of aborting whole zip
					}
				}

				await archive.finalize();
				return;
			}

			return res.status(404).send({ message: "Shared content not found", data: null });
		} catch (ex: unknown) {
			const msg = ex instanceof Error ? ex.message : String(ex);
			logger.error(`Error handling shared download: ${msg}`);
			return res.status(500).send({ message: "An error occurred processing shared link", data: null });
		}
	};
}

export const sharedController = new SharedController();
