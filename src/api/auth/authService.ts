import { StatusCodes } from "http-status-codes";
import bcrypt from "bcryptjs";

import { AuthRepository } from "@/api/auth/authRepository";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { logger } from "@/server";
import { signJwt } from "@/common/utils/jwt";

export class AuthService {
    private authRepository: AuthRepository;

    constructor(repository: AuthRepository = new AuthRepository()) {
        this.authRepository = repository;
    }

    // Login by email and password
    async login(email: string, password: string): Promise<ServiceResponse<{ token: string } | null>> {
        try {
            const user = await this.authRepository.findByEmail(email);
            if (!user) {
                return ServiceResponse.failure("User not found", null, StatusCodes.NOT_FOUND);
            }

            if (!user.password) {
                return ServiceResponse.failure("Invalid credentials", null, StatusCodes.UNAUTHORIZED);
            }

            const passwordMatches = await bcrypt.compare(password, user.password);
            if (!passwordMatches) {
                return ServiceResponse.failure("Invalid credentials", null, StatusCodes.UNAUTHORIZED);
            }   

            const token = signJwt({ userId: user.id, email: user.email });

            return ServiceResponse.success("Login successful", { 
                token, 
                user: {
                    name: user.name,
                    email: user.email,
                    profilePictureUrl: user.profilePictureUrl,
                    storageQuotaBytes: Number(user.storageQuotaBytes),
                    storageUsedBytes: Number(user.storageUsedBytes),
                }
            });
        } catch (ex) {
            const errorMessage = `Error during login: ${(ex as Error).message}`;
            logger.error(errorMessage);
            return ServiceResponse.failure("An error occurred during login.", null, StatusCodes.INTERNAL_SERVER_ERROR);
        }
    }

    // Register a new user
    async register(data: { name?: string; email: string; password?: string }): Promise<ServiceResponse<{ token: string } | null>> {
        try {
            const existing = await this.authRepository.findByEmail(data.email);
            if (existing) {
                return ServiceResponse.failure("Email already in use", null, StatusCodes.CONFLICT);
            }

            const hashed = data.password ? await bcrypt.hash(data.password, 10) : undefined;

            await this.authRepository.createUser({ name: data.name, email: data.email, password: hashed });

            return ServiceResponse.success("Registration successful", null, StatusCodes.CREATED);
        } catch (ex) {
            const errorMessage = `Error during registration: ${(ex as Error).message}`;
            logger.error(errorMessage);
            return ServiceResponse.failure("An error occurred during registration.", null, StatusCodes.INTERNAL_SERVER_ERROR);
        }
    }
}

export const authService = new AuthService();
