import { type File, type Folder, PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

export class StorageRepository {
	// Return root folders and files for a given user id
	async findStorageByUserId(
		userId: string,
		sortBy: "name" | "createdAt" = "createdAt",
		sortOrder: "asc" | "desc" = "asc",
		search?: string,
		type?: string,
	): Promise<{ folders: Folder[]; files: File[] }> {
		const folderOrderBy = sortBy === "name" ? { name: sortOrder } : { createdAt: sortOrder };
		const fileOrderBy = sortBy === "name" ? { originalName: sortOrder } : { createdAt: sortOrder };

		const folderWhere: any = { userId, parentFolderId: null };
		const fileWhere: any = { userId, folderId: null };

		if (search) {
			folderWhere.name = { contains: search, mode: "insensitive" };
			fileWhere.originalName = { contains: search, mode: "insensitive" };
		}

		if (type) {
			// type filtering applies mostly to files, folders are usually always shown or filtered out if strictly file search
			// But user might want to search folders too.
			// If 'type' is specified (e.g. 'image', 'video'), we might only want to show files of that type?
			// Typically folder view shows folders + filtered files.
			if (type === "image") {
				fileWhere.mimeType = { startsWith: "image/" };
			} else if (type === "video") {
				fileWhere.mimeType = { startsWith: "video/" };
			} else if (type === "document") {
				fileWhere.mimeType = {
					in: [
						"application/pdf",
						"application/msword",
						"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
						"application/vnd.ms-excel",
						"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
						"text/plain",
					],
				};
			}
		}

		const folders = await prisma.folder.findMany({
			where: folderWhere,
			orderBy: folderOrderBy,
		});

		const files = await prisma.file.findMany({
			where: fileWhere,
			orderBy: fileOrderBy,
		});

		return { folders, files };
	}

	// Return folder detail by id (including subfolders and files)
	async findStorageByIdWithContent(
		id: string,
		sortBy: "name" | "createdAt" = "createdAt",
		sortOrder: "asc" | "desc" = "asc",
		search?: string,
		type?: string,
	): Promise<{ folders: Folder[]; files: File[]; ancestors: Folder[] }> {
		const folderOrderBy = sortBy === "name" ? { name: sortOrder } : { createdAt: sortOrder };
		const fileOrderBy = sortBy === "name" ? { originalName: sortOrder } : { createdAt: sortOrder };

		const folderWhere: any = { parentFolderId: id };
		const fileWhere: any = { folderId: id };

		if (search) {
			folderWhere.name = { contains: search, mode: "insensitive" };
			fileWhere.originalName = { contains: search, mode: "insensitive" };
		}

		if (type) {
			if (type === "image") {
				fileWhere.mimeType = { startsWith: "image/" };
			} else if (type === "video") {
				fileWhere.mimeType = { startsWith: "video/" };
			} else if (type === "document") {
				fileWhere.mimeType = {
					in: [
						"application/pdf",
						"application/msword",
						"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
						"application/vnd.ms-excel",
						"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
						"text/plain",
					],
				};
			}
		}

		const folders = await prisma.folder.findMany({
			where: folderWhere,
			orderBy: folderOrderBy,
		});

		const files = await prisma.file.findMany({
			where: fileWhere,
			orderBy: fileOrderBy,
		});

		// Fetch ancestors for breadcrumbs
		const ancestors: Folder[] = [];
		let currentFolder = await prisma.folder.findUnique({ where: { id } });

		while (currentFolder && currentFolder.parentFolderId) {
			const parent = await prisma.folder.findUnique({
				where: { id: currentFolder.parentFolderId },
			});
			if (parent) {
				ancestors.unshift(parent);
				currentFolder = parent;
			} else {
				break;
			}
		}
		// If currentFolder is root (parentFolderId is null), it wasn't added in loop if we started from 'id'.
		// Wait, the loop logic above:
		// We start with the *current* folder (the one we are viewing).
		// Does the user want the current folder in ancestors? Usually breadcrumb includes current folder as last item?
		// Or "Ancestors" implies parents only?
		// Let's return the full path including the current folder?
		// Let's assume 'ancestors' means the chain UP TO the current folder.
		// My loop fetches parent, then parent's parent.
		// I should probably start with the current folder itself?

		// Let's refine:
		// Current: (id)
		// Ancestors: [Root, Sub, (Current?)]
		// Usually Breadcrumbs are [Home > FolderA > FolderB (Current)]
		// So I should fetch the current folder first.

		const path: Folder[] = [];
		let curr = await prisma.folder.findUnique({ where: { id } });
		while (curr) {
			path.unshift(curr);
			if (curr.parentFolderId) {
				curr = (await prisma.folder.findUnique({ where: { id: curr.parentFolderId } })) || null;
			} else {
				curr = null;
			}
		}
		// `path` now contains [Root, ..., Current]

		return { folders, files, ancestors: path };
	}

	// Create new folder
	async createFolder(userId: string, name: string, parentFolderId: string | null, color?: string): Promise<Folder> {
		const newFolder = await prisma.folder.create({
			data: {
				userId,
				name,
				parentFolderId,
				color,
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

	// Rename folder
	async renameFolder(id: string, name: string): Promise<Folder> {
		return prisma.folder.update({
			where: { id },
			data: { name },
		});
	}

	// Rename file
	async renameFile(id: string, name: string): Promise<File> {
		return prisma.file.update({
			where: { id },
			data: { originalName: name },
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

	// Create shared link for file
	async createFileShareLink(userId: string, fileId: string, linkToken: string, password?: string) {
		return prisma.sharedLink.create({
			data: {
				userId,
				fileId,
				linkToken,
				password,
			},
		});
	}

	// Create shared link for folder
	async createFolderShareLink(userId: string, folderId: string, linkToken: string, password?: string) {
		return prisma.sharedLink.create({
			data: {
				userId,
				folderId,
				linkToken,
				password,
			},
		});
	}

	// Find shared link
	async findSharedLink(token: string) {
		return prisma.sharedLink.findFirst({
			where: { linkToken: token },
		});
	}

	// Get user storage info
	async findUserById(userId: string) {
		return prisma.user.findUnique({
			where: { id: userId },
		});
	}

	// Get storage statistics by file categories
	async getStorageStatisticsByCategory(userId: string) {
		const files = await prisma.file.findMany({
			where: { userId },
			select: {
				mimeType: true,
				sizeBytes: true,
			},
		});

		return files;
	}
}
