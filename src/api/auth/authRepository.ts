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
}
