import type { User } from "@/generated/prisma";
import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

export class AuthRepository {
	async findByEmail(email: string): Promise<User | null> {
		return prisma.user.findUnique({ where: { email } });
	}

	async findById(id: string): Promise<User | null> {
		return prisma.user.findUnique({ where: { id } });
	}

	async findByGoogleId(googleId: string): Promise<User | null> {
		return prisma.user.findUnique({ where: { googleId } });
	}

	async findByGitHubId(githubId: string): Promise<User | null> {
		return prisma.user.findUnique({ where: { githubId } });
	}

	async updateById(id: string, data: { name?: string; profilePicture?: string; password?: string }): Promise<void> {
		const updateData: any = {
			name: data.name,
			password: data.password,
		};

		if (data.profilePicture !== undefined) {
			updateData.profilePictureUrl = data.profilePicture;
		}

		await prisma.user.update({
			where: { id },
			data: updateData,
		});
	}

	async createUser(data: { name?: string; email: string; password?: string }): Promise<User> {
		return prisma.user.create({ data });
	}

	async createOAuthUser(data: {
		email: string;
		name?: string;
		profilePictureUrl?: string;
		googleId?: string;
		githubId?: string;
	}): Promise<User> {
		return prisma.user.create({ data });
	}

	async updateWithOAuthId(
		userId: string,
		data: { googleId?: string; githubId?: string; profilePictureUrl?: string },
	): Promise<void> {
		await prisma.user.update({
			where: { id: userId },
			data,
		});
	}

	async createRefreshToken(userId: string, token: string, expiredAt: Date): Promise<void> {
		await prisma.refreshToken.create({
			data: {
				userId,
				token,
				expiredAt,
			},
		});
	}

	async findRefreshToken(token: string): Promise<{ id: string; userId: string } | null> {
		const refreshToken = await prisma.refreshToken.findFirst({
			where: {
				token,
				expiredAt: { gt: new Date() },
			},
			select: { id: true, userId: true },
		});
		return refreshToken;
	}

	async deleteExpiredRefreshTokens(): Promise<void> {
		await prisma.refreshToken.deleteMany({
			where: { expiredAt: { lt: new Date() } },
		});
	}

	async deleteRefreshToken(token: string): Promise<void> {
		await prisma.refreshToken.deleteMany({ where: { token } });
	}
}
