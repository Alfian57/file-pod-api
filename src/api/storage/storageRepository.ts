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

	// Return folder by id
	async findFolderById(id: string): Promise<Folder | null> {
		const folder = await prisma.folder.findUnique({
			where: { id },
		});
		return folder;
	}

	// Upload file to a folder
	async uploadFile(
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
