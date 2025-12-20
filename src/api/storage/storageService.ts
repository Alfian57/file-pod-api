import { randomBytes } from "node:crypto";
import { StatusCodes } from "http-status-codes";

import { StorageRepository } from "@/api/storage/storageRepository";
import { minioClient } from "@/common/lib/minio";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { env } from "@/common/utils/envConfig";
import { logger } from "@/server";
import type {
	CreateFolderResponseData,
	DownloadFileResponseData,
	GetStorageDetailResponseData,
	GetStorageResponseData,
	GetStorageStatisticsResponseData,
	RenameFileResponseData,
	RenameFolderResponseData,
	ShareFileResponseData,
	ShareFolderResponseData,
	UploadFileResponseData,
} from "./storageModel";

export class StorageService {
	private storageRepository: StorageRepository;

	constructor(repository: StorageRepository = new StorageRepository()) {
		this.storageRepository = repository;
	}

	async getStorage(
		userId: string,
		sortBy: "name" | "createdAt" = "createdAt",
		sortOrder: "asc" | "desc" = "asc",
		search?: string,
		type?: string,
	): Promise<ServiceResponse<GetStorageResponseData | null>> {
		try {
			const result = await this.storageRepository.findStorageByUserId(userId, sortBy, sortOrder, search, type);

			const mapped = {
				folders: result.folders.map((f) => ({
					id: f.id,
					name: f.name,
					createdAt: f.createdAt.toISOString(),
					color: f.color,
				})),
				files: result.files.map((fi) => ({
					id: fi.id,
					originalName: fi.originalName,
					filename: fi.filename,
					mimeType: fi.mimeType,
					sizeBytes: fi.sizeBytes != null ? String(fi.sizeBytes) : null,
					createdAt: fi.createdAt.toISOString(),
				})),
			};

			return ServiceResponse.success("Storage fetched", mapped, StatusCodes.OK);
		} catch (ex) {
			const errorMessage = `Error fetching storage: ${(ex as Error).message}`;
			logger.error(errorMessage);
			return ServiceResponse.failure("An error occurred fetching storage.", null, StatusCodes.INTERNAL_SERVER_ERROR);
		}
	}

	async getStorageDetail(
		id: string,
		sortBy: "name" | "createdAt" = "createdAt",
		sortOrder: "asc" | "desc" = "asc",
		search?: string,
		type?: string,
	): Promise<ServiceResponse<GetStorageDetailResponseData | null>> {
		try {
			const result = await this.storageRepository.findStorageByIdWithContent(id, sortBy, sortOrder, search, type);
			const mapped = {
				folders: result.folders.map((f) => ({
					id: f.id,
					name: f.name,
					createdAt: f.createdAt.toISOString(),
					color: f.color,
				})),
				files: result.files.map((fi) => ({
					id: fi.id,
					originalName: fi.originalName,
					filename: fi.filename,
					mimeType: fi.mimeType,
					sizeBytes: fi.sizeBytes != null ? String(fi.sizeBytes) : null,
					createdAt: fi.createdAt.toISOString(),
				})),
				ancestors: result.ancestors.map((f) => ({
					id: f.id,
					name: f.name,
					createdAt: f.createdAt.toISOString(),
					color: f.color,
				})),
			};
			return ServiceResponse.success("Folder fetched", mapped, StatusCodes.OK);
		} catch (ex) {
			const errorMessage = `Error fetching folder detail: ${(ex as Error).message}`;
			logger.error(errorMessage);
			return ServiceResponse.failure(
				"An error occurred fetching folder detail.",
				null,
				StatusCodes.INTERNAL_SERVER_ERROR,
			);
		}
	}

	async createFolder(
		userId: string,
		name: string,
		parentFolderId: string | null,
		color?: string,
	): Promise<ServiceResponse<CreateFolderResponseData | null>> {
		try {
			const normalizedParentId =
				parentFolderId === "" || parentFolderId === "null" || typeof parentFolderId === "undefined"
					? null
					: parentFolderId;

			if (normalizedParentId) {
				const parentFolder = await this.storageRepository.findFolderById(normalizedParentId);
				if (!parentFolder) {
					return ServiceResponse.failure("Parent folder not found", null, StatusCodes.NOT_FOUND);
				}
			}

			await this.storageRepository.createFolder(userId, name, normalizedParentId, color);
			return ServiceResponse.success("Folder created", null, StatusCodes.CREATED);
		} catch (ex) {
			const errorMessage = `Error creating folder: ${(ex as Error).message}`;
			logger.error(errorMessage);
			return ServiceResponse.failure("An error occurred creating folder.", null, StatusCodes.INTERNAL_SERVER_ERROR);
		}
	}

	async deleteFolder(id: string): Promise<ServiceResponse<null>> {
		try {
			const folder = await this.storageRepository.findFolderById(id);
			if (!folder) {
				return ServiceResponse.failure("Folder not found", null, StatusCodes.NOT_FOUND);
			}

			await this.storageRepository.deleteFolderById(id);
			await this.storageRepository.deleteFilesByFolderId(id);
			return ServiceResponse.success("Folder deleted", null, StatusCodes.OK);
		} catch (ex) {
			const errorMessage = `Error deleting folder: ${(ex as Error).message}`;
			logger.error(errorMessage);
			return ServiceResponse.failure("An error occurred deleting folder.", null, StatusCodes.INTERNAL_SERVER_ERROR);
		}
	}

	async uploadFile(
		userId: string,
		folderId: string | null,
		files: Express.Multer.File[],
	): Promise<ServiceResponse<UploadFileResponseData | null>> {
		try {
			const folder = folderId ? await this.storageRepository.findFolderById(folderId) : null;
			if (folderId && !folder) {
				return ServiceResponse.failure("Folder not found", null, StatusCodes.NOT_FOUND);
			}

			const uploadPromises = files.map(async (file) => {
				const { originalname: originalName, mimetype: mimeType, size: sizeBytes } = file;
				const filename = `${userId}/${Date.now()}-${originalName}`;

				await this.storageRepository.createFile(
					userId,
					folder ? folder.id : null,
					originalName,
					filename,
					mimeType,
					BigInt(sizeBytes),
				);
				await this.storageRepository.updateUserUsedStorageBytes(userId, BigInt(sizeBytes));
				await minioClient.putObject(env.MINIO_BUCKET_NAME, filename, file.buffer);
			});
			await Promise.all(uploadPromises);

			return ServiceResponse.success("File uploaded", null, StatusCodes.CREATED);
		} catch (ex) {
			const errorMessage = `Error uploading file: ${(ex as Error).message}`;
			logger.error(errorMessage);
			return ServiceResponse.failure("An error occurred uploading file.", null, StatusCodes.INTERNAL_SERVER_ERROR);
		}
	}

	async deleteFile(id: string): Promise<ServiceResponse<null>> {
		try {
			const file = await this.storageRepository.findFileById(id);
			if (!file) {
				return ServiceResponse.failure("File not found", null, StatusCodes.NOT_FOUND);
			}

			await this.storageRepository.deleteFileById(id);
			await this.storageRepository.updateUserUsedStorageBytes(file.userId, BigInt(-file.sizeBytes));
			await minioClient.removeObject(env.MINIO_BUCKET_NAME, file.filename);

			return ServiceResponse.success("File deleted", null, StatusCodes.OK);
		} catch (ex) {
			const errorMessage = `Error deleting file: ${(ex as Error).message}`;
			logger.error(errorMessage);
			return ServiceResponse.failure("An error occurred deleting file.", null, StatusCodes.INTERNAL_SERVER_ERROR);
		}
	}

	async downloadFile(id: string): Promise<ServiceResponse<DownloadFileResponseData | null>> {
		try {
			const file = await this.storageRepository.findFileById(id);
			if (!file) {
				return ServiceResponse.failure("File not found", null, StatusCodes.NOT_FOUND);
			}

			const objectStream = await minioClient.getObject(env.MINIO_BUCKET_NAME, file.filename);

			return ServiceResponse.success(
				"File stream ready",
				{ stream: objectStream, filename: file.originalName, contentType: file.mimeType },
				StatusCodes.OK,
			);
		} catch (ex) {
			const errorMessage = `Error downloading file: ${(ex as Error).message}`;
			logger.error(errorMessage);
			return ServiceResponse.failure("An error occurred downloading file.", null, StatusCodes.INTERNAL_SERVER_ERROR);
		}
	}

	async shareFile(
		userId: string,
		fileId: string,
		password?: string,
	): Promise<ServiceResponse<ShareFileResponseData | null>> {
		try {
			const file = await this.storageRepository.findFileById(fileId);
			if (!file) {
				return ServiceResponse.failure("File not found", null, StatusCodes.NOT_FOUND);
			}

			if (file.userId !== userId) {
				return ServiceResponse.failure("Unauthorized", null, StatusCodes.FORBIDDEN);
			}

			const linkToken = randomBytes(32).toString("hex");
			await this.storageRepository.createFileShareLink(userId, fileId, linkToken, password);

			const shareUrl = `${env.APP_URL}/shared/${linkToken}`;

			return ServiceResponse.success("File shared successfully", { linkToken, shareUrl }, StatusCodes.CREATED);
		} catch (ex) {
			const errorMessage = `Error sharing file: ${(ex as Error).message}`;
			logger.error(errorMessage);
			return ServiceResponse.failure("An error occurred sharing file.", null, StatusCodes.INTERNAL_SERVER_ERROR);
		}
	}

	async shareFolder(
		userId: string,
		folderId: string,
		password?: string,
	): Promise<ServiceResponse<ShareFolderResponseData | null>> {
		try {
			const folder = await this.storageRepository.findFolderById(folderId);
			if (!folder) {
				return ServiceResponse.failure("Folder not found", null, StatusCodes.NOT_FOUND);
			}

			if (folder.userId !== userId) {
				return ServiceResponse.failure("Unauthorized", null, StatusCodes.FORBIDDEN);
			}

			const linkToken = randomBytes(32).toString("hex");
			await this.storageRepository.createFolderShareLink(userId, folderId, linkToken, password);

			const shareUrl = `${env.APP_URL}/shared/${linkToken}`;

			return ServiceResponse.success("Folder shared successfully", { linkToken, shareUrl }, StatusCodes.CREATED);
		} catch (ex) {
			const errorMessage = `Error sharing folder: ${(ex as Error).message}`;
			logger.error(errorMessage);
			return ServiceResponse.failure("An error occurred sharing folder.", null, StatusCodes.INTERNAL_SERVER_ERROR);
		}
	}

	async getStorageStatistics(userId: string): Promise<ServiceResponse<GetStorageStatisticsResponseData | null>> {
		try {
			const user = await this.storageRepository.findUserById(userId);
			if (!user) {
				return ServiceResponse.failure("User not found", null, StatusCodes.NOT_FOUND);
			}

			const files = await this.storageRepository.getStorageStatisticsByCategory(userId);

			// Group files by category
			const categoryStats: Record<string, { sizeBytes: bigint; count: number }> = {
				"Design Files": { sizeBytes: BigInt(0), count: 0 },
				Images: { sizeBytes: BigInt(0), count: 0 },
				Video: { sizeBytes: BigInt(0), count: 0 },
				Documents: { sizeBytes: BigInt(0), count: 0 },
				Others: { sizeBytes: BigInt(0), count: 0 },
			};

			for (const file of files) {
				let categorized = false;

				// Check Design Files (excluding images that are in design category)
				if (
					file.mimeType.match(
						/(application\/pdf|application\/postscript|vnd\.adobe\.photoshop|illustrator|x-photoshop|vnd\.sketch|vnd\.figma|x-figma)/i,
					)
				) {
					categoryStats["Design Files"].sizeBytes += file.sizeBytes;
					categoryStats["Design Files"].count += 1;
					categorized = true;
				}
				// Check Images (but not design files)
				else if (file.mimeType.startsWith("image/")) {
					categoryStats.Images.sizeBytes += file.sizeBytes;
					categoryStats.Images.count += 1;
					categorized = true;
				}
				// Check Video
				else if (file.mimeType.startsWith("video/")) {
					categoryStats.Video.sizeBytes += file.sizeBytes;
					categoryStats.Video.count += 1;
					categorized = true;
				}
				// Check Documents
				else if (
					file.mimeType.match(
						/(msword|wordprocessingml|ms-excel|spreadsheetml|ms-powerpoint|presentationml|text\/plain|text\/csv|application\/rtf)/i,
					)
				) {
					categoryStats.Documents.sizeBytes += file.sizeBytes;
					categoryStats.Documents.count += 1;
					categorized = true;
				}

				// If not categorized, put in Others
				if (!categorized) {
					categoryStats.Others.sizeBytes += file.sizeBytes;
					categoryStats.Others.count += 1;
				}
			}

			const categories = Object.entries(categoryStats).map(([category, stats]) => ({
				category,
				sizeBytes: stats.sizeBytes.toString(),
				count: stats.count,
			}));

			const totalBytes = user.storageQuotaBytes.toString();
			const usedBytes = user.storageUsedBytes.toString();
			const availableBytes = (user.storageQuotaBytes - user.storageUsedBytes).toString();

			const response: GetStorageStatisticsResponseData = {
				totalBytes,
				usedBytes,
				availableBytes,
				categories,
			};

			return ServiceResponse.success("Storage statistics fetched", response, StatusCodes.OK);
		} catch (ex) {
			const errorMessage = `Error fetching storage statistics: ${(ex as Error).message}`;
			logger.error(errorMessage);
			return ServiceResponse.failure(
				"An error occurred fetching storage statistics.",
				null,
				StatusCodes.INTERNAL_SERVER_ERROR,
			);
		}
	}

	async renameFolder(id: string, name: string): Promise<ServiceResponse<RenameFolderResponseData | null>> {
		try {
			const folder = await this.storageRepository.renameFolder(id, name);
			if (!folder) return ServiceResponse.failure("Folder not found", null, StatusCodes.NOT_FOUND);

			const mapped = {
				id: folder.id,
				name: folder.name,
				createdAt: folder.createdAt.toISOString(),
				color: folder.color,
			};
			return ServiceResponse.success("Folder renamed", mapped, StatusCodes.OK);
		} catch (ex) {
			const errorMessage = `Error renaming folder: ${(ex as Error).message}`;
			logger.error(errorMessage);
			return ServiceResponse.failure("An error occurred renaming folder.", null, StatusCodes.INTERNAL_SERVER_ERROR);
		}
	}

	async renameFile(id: string, name: string): Promise<ServiceResponse<RenameFileResponseData | null>> {
		try {
			const file = await this.storageRepository.renameFile(id, name);
			if (!file) return ServiceResponse.failure("File not found", null, StatusCodes.NOT_FOUND);

			const mapped = {
				id: file.id,
				originalName: file.originalName,
				filename: file.filename,
				mimeType: file.mimeType,
				sizeBytes: file.sizeBytes?.toString() ?? null,
				createdAt: file.createdAt.toISOString(),
			};
			return ServiceResponse.success("File renamed", mapped, StatusCodes.OK);
		} catch (ex) {
			const errorMessage = `Error renaming file: ${(ex as Error).message}`;
			logger.error(errorMessage);
			return ServiceResponse.failure("An error occurred renaming file.", null, StatusCodes.INTERNAL_SERVER_ERROR);
		}
	}
}

export const storageService = new StorageService();
