import { StatusCodes } from "http-status-codes";

import { StorageRepository } from "@/api/storage/storageRepository";
import { ServiceResponse } from "@/common/models/serviceResponse";
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
			const result = await this.storageRepository.findByUserId(userId);
			return ServiceResponse.success("Storage fetched", result, StatusCodes.OK);
		} catch (ex) {
			const errorMessage = `Error fetching storage: ${(ex as Error).message}`;
			logger.error(errorMessage);
			return ServiceResponse.failure("An error occurred fetching storage.", null, StatusCodes.INTERNAL_SERVER_ERROR);
		}
	}

	// Get folder detail by id
	async getStorageDetail(id: string): Promise<ServiceResponse<RootStorage | null>> {
		try {
			const result = await this.storageRepository.findByIdWithContent(id);
			return ServiceResponse.success("Folder fetched", result, StatusCodes.OK);
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
}

export const storageService = new StorageService();
