import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

export class SharedRepository {
	async findByToken(token: string) {
		return prisma.sharedLink.findUnique({
			where: { linkToken: token },
			include: { file: true, folder: true, user: true },
		});
	}

	// recursively collect files under a folder
	async collectFilesFromFolder(folderId: string) {
		const files: Array<{ id: string; originalName: string; filename: string; mimeType: string }> = [];

		const stack = [folderId];
		while (stack.length > 0) {
			const currentFolderId = stack.pop() as string;

			const folderFiles = await prisma.file.findMany({ where: { folderId: currentFolderId } });
			folderFiles.forEach((f) =>
				files.push({ id: f.id, originalName: f.originalName, filename: f.filename, mimeType: f.mimeType }),
			);

			const subFolders = await prisma.folder.findMany({ where: { parentFolderId: currentFolderId } });
			subFolders.forEach((sf) => stack.push(sf.id));
		}

		return files;
	}
}

export const sharedRepository = new SharedRepository();
