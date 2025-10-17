import bcrypt from "bcryptjs";
import { StatusCodes } from "http-status-codes";

import { AuthRepository } from "@/api/auth/authRepository";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { signJwt } from "@/common/utils/jwt";
import { generateRefreshToken, getRefreshTokenExpiryDate } from "@/common/utils/refreshToken";
import { logger } from "@/server";
import type {
	GetCurrentUserResponseData,
	LoginResponseData,
	LogoutResponseData,
	RefreshTokenResponseData,
	RegisterResponseData,
} from "./authModel";

export class AuthService {
	private authRepository: AuthRepository;

	constructor(repository: AuthRepository = new AuthRepository()) {
		this.authRepository = repository;
	}

	// Login by email and password
	async login(email: string, password: string): Promise<ServiceResponse<LoginResponseData | null>> {
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

			const accessToken = signJwt({ userId: user.id, email: user.email });
			const refreshToken = generateRefreshToken();
			const refreshTokenExpiredAt = getRefreshTokenExpiryDate();

			await this.authRepository.createRefreshToken(user.id, refreshToken, refreshTokenExpiredAt);

			return ServiceResponse.success("Login successful", {
				accessToken,
				refreshToken,
				user: {
					name: user.name ?? undefined,
					email: user.email,
					profilePictureUrl: user.profilePictureUrl ?? undefined,
					storageQuotaBytes: Number(user.storageQuotaBytes),
					storageUsedBytes: Number(user.storageUsedBytes),
				},
			});
		} catch (ex) {
			const errorMessage = `Error during login: ${(ex as Error).message}`;
			logger.error(errorMessage);
			return ServiceResponse.failure("An error occurred during login.", null, StatusCodes.INTERNAL_SERVER_ERROR);
		}
	}

	// Register a new user
	async register(name: string, email: string, password: string): Promise<ServiceResponse<RegisterResponseData | null>> {
		try {
			const existing = await this.authRepository.findByEmail(email);
			if (existing) {
				return ServiceResponse.failure("Email already in use", null, StatusCodes.CONFLICT);
			}

			const hashed = password ? await bcrypt.hash(password, 10) : undefined;

			await this.authRepository.createUser({ name: name, email: email, password: hashed });

			return ServiceResponse.success("Registration successful", null, StatusCodes.CREATED);
		} catch (ex) {
			const errorMessage = `Error during registration: ${(ex as Error).message}`;
			logger.error(errorMessage);
			return ServiceResponse.failure("An error occurred during registration.", null, StatusCodes.INTERNAL_SERVER_ERROR);
		}
	}

	// Refresh Token
	async refreshToken(token: string): Promise<ServiceResponse<RefreshTokenResponseData | null>> {
		try {
			const existingRefreshToken = await this.authRepository.findRefreshToken(token);
			if (!existingRefreshToken) {
				return ServiceResponse.failure("Refresh token not found", null, StatusCodes.NOT_FOUND);
			}

			const user = await this.authRepository.findById(existingRefreshToken.userId);
			if (!user) {
				return ServiceResponse.failure("User not found", null, StatusCodes.NOT_FOUND);
			}

			const accessToken = signJwt({ userId: user.id, email: user.email });
			const refreshToken = generateRefreshToken();
			const refreshTokenExpiredAt = getRefreshTokenExpiryDate();

			await this.authRepository.createRefreshToken(user.id, refreshToken, refreshTokenExpiredAt);
			await this.authRepository.deleteRefreshToken(token);

			return ServiceResponse.success("Refresh token successful", {
				accessToken,
				refreshToken,
			});
		} catch (ex) {
			const errorMessage = `Error during refresh token: ${(ex as Error).message}`;
			logger.error(errorMessage);
			return ServiceResponse.failure(
				"An error occurred during refresh token.",
				null,
				StatusCodes.INTERNAL_SERVER_ERROR,
			);
		}
	}

	// Logout
	async logout(token: string): Promise<ServiceResponse<LogoutResponseData | null>> {
		try {
			const existingRefreshToken = await this.authRepository.findRefreshToken(token);
			if (!existingRefreshToken) {
				return ServiceResponse.failure("Refresh token not found", null, StatusCodes.NOT_FOUND);
			}

			await this.authRepository.deleteRefreshToken(token);
			return ServiceResponse.success("logout successful", null, StatusCodes.OK);
		} catch (ex) {
			const errorMessage = `Error during logout: ${(ex as Error).message}`;
			logger.error(errorMessage);
			return ServiceResponse.failure("An error occurred during logout.", null, StatusCodes.INTERNAL_SERVER_ERROR);
		}
	}

	// Get Current User
	async getCurrentUser(userId: string): Promise<ServiceResponse<GetCurrentUserResponseData | null>> {
		try {
			const user = await this.authRepository.findById(userId);
			if (!user) {
				return ServiceResponse.failure("User not found", null, StatusCodes.NOT_FOUND);
			}

			return ServiceResponse.success("User retrieved successfully", {
				name: user.name ?? undefined,
				email: user.email,
				profilePictureUrl: user.profilePictureUrl ?? undefined,
				storageQuotaBytes: Number(user.storageQuotaBytes),
				storageUsedBytes: Number(user.storageUsedBytes),
			});
		} catch (ex) {
			const errorMessage = `Error during get current user: ${(ex as Error).message}`;
			logger.error(errorMessage);
			return ServiceResponse.failure(
				"An error occurred while retrieving the user.",
				null,
				StatusCodes.INTERNAL_SERVER_ERROR,
			);
		}
	}
}

export const authService = new AuthService();
