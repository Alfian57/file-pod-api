import { type File, type Folder, PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

export class StorageRepository {
	// Return root folders and files for a given user id
	async findByUserId(userId: string): Promise<{ folders: Folder[]; files: File[] }> {
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
	async findByIdWithContent(id: string): Promise<{ folders: Folder[]; files: File[] }> {
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
}
