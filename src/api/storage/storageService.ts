import { StatusCodes } from "http-status-codes";

import { StorageRepository } from "@/api/storage/storageRepository";
import { minioClient } from "@/common/lib/minio";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { env } from "@/common/utils/envConfig";
import { logger } from "@/server";
import type { GetStorageDetailResponseData, GetStorageResponseData, UploadFileResponseData } from "./storageModel";

export class StorageService {
	private storageRepository: StorageRepository;

	constructor(repository: StorageRepository = new StorageRepository()) {
		this.storageRepository = repository;
	}

	// Get list of root folders and files for an authenticated user
	async getStorage(userId: string): Promise<ServiceResponse<GetStorageResponseData | null>> {
		try {
			const result = await this.storageRepository.findStorageByUserId(userId);

			const mapped = {
				folders: result.folders.map((f) => ({ id: f.id, name: f.name, createdAt: f.createdAt.toISOString() })),
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

	// Get folder detail by id
	async getStorageDetail(id: string): Promise<ServiceResponse<GetStorageDetailResponseData | null>> {
		try {
			const result = await this.storageRepository.findStorageByIdWithContent(id);
			const mapped = {
				folders: result.folders.map((f) => ({ id: f.id, name: f.name, createdAt: f.createdAt.toISOString() })),
				files: result.files.map((fi) => ({
					id: fi.id,
					originalName: fi.originalName,
					filename: fi.filename,
					mimeType: fi.mimeType,
					sizeBytes: fi.sizeBytes != null ? String(fi.sizeBytes) : null,
					createdAt: fi.createdAt.toISOString(),
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

	// Upload file to a folder
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

				await this.storageRepository.uploadFile(
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
}

export const storageService = new StorageService();
