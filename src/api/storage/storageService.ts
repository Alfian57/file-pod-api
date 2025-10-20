import { StatusCodes } from "http-status-codes";

import { StorageRepository } from "@/api/storage/storageRepository";
import { ServiceResponse } from "@/common/models/serviceResponse";
import type { File } from "@/generated/prisma";
import { logger } from "@/server";
import type { RootStorage } from "./storageModel";

export class StorageService {
	private storageRepository: StorageRepository;

	constructor(repository: StorageRepository = new StorageRepository()) {
		this.storageRepository = repository;
	}

	// Get list of root folders and files for an authenticated user
	async getStorage(userId: string): Promise<ServiceResponse<RootStorage | null>> {
		try {
			const result = await this.storageRepository.findStorageByUserId(userId);

			const mapped = {
				folders: result.folders.map((f) => ({ id: f.id, name: f.name, createdAt: f.createdAt.toISOString() })),
				files: result.files.map((fi) => ({
					id: fi.id,
					name: fi.name,
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
	async getStorageDetail(id: string): Promise<ServiceResponse<RootStorage | null>> {
		try {
			const result = await this.storageRepository.findStorageByIdWithContent(id);
			const mapped = {
				folders: result.folders.map((f) => ({ id: f.id, name: f.name, createdAt: f.createdAt.toISOString() })),
				files: result.files.map((fi) => ({
					id: fi.id,
					name: fi.name,
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
		name: string,
		mimeType: string,
		sizeBytes: number | bigint,
	): Promise<ServiceResponse<Record<string, unknown> | null>> {
		try {
			const folder = folderId ? await this.storageRepository.findFolderById(folderId) : null;
			if (folderId && !folder) {
				return ServiceResponse.failure("Folder not found", null, StatusCodes.NOT_FOUND);
			}

			const created: File = await this.storageRepository.uploadFile(
				userId,
				folderId ?? null,
				name,
				mimeType,
				sizeBytes,
			);

			const response = {
				id: created.id,
				userId: created.userId,
				folderId: created.folderId,
				name: created.name,
				mimeType: created.mimeType,
				sizeBytes: String(created.sizeBytes),
				createdAt: created.createdAt.toISOString(),
			};

			return ServiceResponse.success("File uploaded", response, StatusCodes.CREATED);
		} catch (ex) {
			const errorMessage = `Error uploading file: ${(ex as Error).message}`;
			logger.error(errorMessage);
			return ServiceResponse.failure("An error occurred uploading file.", null, StatusCodes.INTERNAL_SERVER_ERROR);
		}
	}
}

export const storageService = new StorageService();
