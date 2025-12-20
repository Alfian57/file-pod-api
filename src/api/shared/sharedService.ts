import type { Readable } from "node:stream";
import { StatusCodes } from "http-status-codes";
import { minioClient } from "@/common/lib/minio";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { env } from "@/common/utils/envConfig";
import { logger } from "@/server";
import type { SharedFilePayload, SharedFolderPayload } from "./sharedModel";
import { sharedRepository } from "./sharedRepository";

export class SharedService {
	async getSharedLink(
		token: string,
		providedPassword?: string,
	): Promise<ServiceResponse<SharedFilePayload | SharedFolderPayload | null>> {
		try {
			const link = await sharedRepository.findByToken(token);
			if (!link) return ServiceResponse.failure("Link not found", null, StatusCodes.NOT_FOUND);

			if (link.password) {
				if (!providedPassword || providedPassword !== link.password) {
					return ServiceResponse.failure("Invalid password", null, StatusCodes.UNAUTHORIZED);
				}
			}

			if (link.fileId && link.file) {
				// file share
				return ServiceResponse.success(
					"file",
					{
						type: "file",
						file: {
							id: link.file.id,
							originalName: link.file.originalName,
							filename: link.file.filename,
							mimeType: link.file.mimeType,
						},
					},
					StatusCodes.OK,
				);
			}

			if (link.folderId && link.folder) {
				// gather files inside folder
				const files = await sharedRepository.collectFilesFromFolder(link.folderId);
				return ServiceResponse.success(
					"folder",
					{ type: "folder", folder: { id: link.folder.id, name: link.folder.name }, files },
					StatusCodes.OK,
				);
			}

			return ServiceResponse.failure("Shared target not found", null, StatusCodes.NOT_FOUND);
		} catch (ex: unknown) {
			const message = ex instanceof Error ? ex.message : String(ex);
			logger.error(`Error getting shared link: ${message}`);
			return ServiceResponse.failure("An error occurred", null, StatusCodes.INTERNAL_SERVER_ERROR);
		}
	}

	async getSharedLinkMeta(token: string): Promise<ServiceResponse<any | null>> {
		try {
			const link = await sharedRepository.findByToken(token);
			if (!link) return ServiceResponse.failure("Link not found", null, StatusCodes.NOT_FOUND);

			const isPasswordProtected = !!link.password;
			let name = "Unknown Content";
			let type = "unknown";
			let size = "0";

			if (link.fileId && link.file) {
				name = link.file.originalName;
				type = "file";
				size = link.file.sizeBytes ? link.file.sizeBytes.toString() : "0";
			} else if (link.folderId && link.folder) {
				name = link.folder.name;
				type = "folder";
			}

			// If text is strictly "Protected Content" if password, uncomment below.
			// For now, showing name is better UX.

			return ServiceResponse.success(
				"Link info",
				{
					token: link.linkToken,
					isPasswordProtected,
					name,
					type,
					size,
					ownerName: link.user?.name ?? "Someone",
				},
				StatusCodes.OK,
			);
		} catch (ex: unknown) {
			const message = ex instanceof Error ? ex.message : String(ex);
			logger.error(`Error getting shared link meta: ${message}`);
			return ServiceResponse.failure("An error occurred", null, StatusCodes.INTERNAL_SERVER_ERROR);
		}
	}

	// helper to get object stream from minio
	async getObjectStream(objectName: string): Promise<Readable> {
		return minioClient.getObject(env.MINIO_BUCKET_NAME, objectName) as Promise<Readable>;
	}
}

export const sharedService = new SharedService();
