import { type File, type Folder, PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

export class StorageRepository {
	// Return root folders and files for a given user id
	async findStorageByUserId(userId: string): Promise<{ folders: Folder[]; files: File[] }> {
		const folders = await prisma.folder.findMany({
			where: { userId, parentFolderId: null },
			orderBy: { createdAt: "asc" },
		});

		const files = await prisma.file.findMany({
			where: { userId, folderId: null },
			orderBy: { createdAt: "asc" },
		});

		return { folders, files };
	}

	// Return folder detail by id (including subfolders and files)
	async findStorageByIdWithContent(id: string): Promise<{ folders: Folder[]; files: File[] }> {
		const folders = await prisma.folder.findMany({
			where: { parentFolderId: id },
			orderBy: { createdAt: "asc" },
		});

		const files = await prisma.file.findMany({
			where: { folderId: id },
			orderBy: { createdAt: "asc" },
		});

		return { folders, files };
	}

	// Create new folder
	async createFolder(userId: string, name: string, parentFolderId: string | null): Promise<Folder> {
		const newFolder = await prisma.folder.create({
			data: {
				userId,
				name,
				parentFolderId,
			},
		});
		return newFolder;
	}

	// Return folder by id
	async findFolderById(id: string): Promise<Folder | null> {
		const folder = await prisma.folder.findUnique({
			where: { id },
		});
		return folder;
	}

	// Delete folder by id
	async deleteFolderById(id: string): Promise<void> {
		await prisma.folder.delete({
			where: { id },
		});
	}

	// Create file to a folder
	async createFile(
		userId: string,
		folderId: string | null,
		originalName: string,
		filename: string,
		mimeType: string,
		sizeBytes: bigint,
	): Promise<File> {
		const newFile = await prisma.file.create({
			data: {
				userId,
				folderId,
				originalName,
				filename,
				mimeType,
				sizeBytes,
			},
		});
		return newFile;
	}

	// Return file by id
	async findFileById(id: string): Promise<File | null> {
		const file = await prisma.file.findUnique({
			where: { id },
		});
		return file;
	}

	// Delete file by id
	async deleteFileById(id: string): Promise<void> {
		await prisma.file.delete({
			where: { id },
		});
	}

	// Delete file by folder id
	async deleteFilesByFolderId(folderId: string): Promise<void> {
		await prisma.file.deleteMany({
			where: { folderId },
		});
	}

	// Update user's used storage bytes
	async updateUserUsedStorageBytes(userId: string, sizeBytes: bigint): Promise<void> {
		await prisma.user.update({
			where: { id: userId },
			data: {
				storageUsedBytes: {
					increment: sizeBytes,
				},
			},
		});
	}
}
