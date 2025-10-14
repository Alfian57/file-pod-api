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

    async createUser(data: { name?: string; email: string; password?: string }): Promise<User> {
        return prisma.user.create({ data });
    }

    async createRefreshToken(userId: string, token: string, expiredAt: Date): Promise<void> {
        await prisma.refreshToken.create({
            data: {
                userId,
                token,
                expiredAt
            },
        });
    }

    async findRefreshToken(token: string): Promise<{ id: string; userId: string } | null> {
        const refreshToken = await prisma.refreshToken.findUnique({
            where: { token },
            select: { id: true, userId: true },
        });
        return refreshToken;
    }

    async deleteRefreshToken(token: string): Promise<void> {
        await prisma.refreshToken.deleteMany({ where: { token } });
    }
}
