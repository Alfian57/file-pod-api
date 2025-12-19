import bcrypt from "bcryptjs";
import { StatusCodes } from "http-status-codes";

import { AuthRepository } from "@/api/auth/authRepository";
import { minioClient } from "@/common/lib/minio";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { env } from "@/common/utils/envConfig";
import { signJwt } from "@/common/utils/jwt";
import { generateRefreshToken, getRefreshTokenExpiryDate } from "@/common/utils/refreshToken";
import { logger } from "@/server";
import type {
	GetCurrentUserResponseData,
	LoginResponseData,
	LogoutResponseData,
	RefreshTokenResponseData,
	RegisterResponseData,
	UpdatePasswordResponseData,
	UpdateProfileResponseData,
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

	// Update Profile
	async updateProfile(
		userId: string,
		name?: string,
		profilePicture?: Express.Multer.File,
	): Promise<ServiceResponse<UpdateProfileResponseData | null>> {
		try {
			let profilePictureFilename: string | undefined;

			if (profilePicture) {
				const { originalname: originalName } = profilePicture;
				const filename = `${userId}/${Date.now()}-avatar-${originalName}`;

				await minioClient.putObject(env.MINIO_BUCKET_NAME, filename, profilePicture.buffer);
				profilePictureFilename = filename;
			}

			await this.authRepository.updateById(userId, { name, profilePicture: profilePictureFilename });
			return ServiceResponse.success("update profile successful", null, StatusCodes.OK);
		} catch (ex) {
			const errorMessage = `Error during update profile: ${(ex as Error).message}`;
			logger.error(errorMessage);
			return ServiceResponse.failure(
				"An error occurred during update profile.",
				null,
				StatusCodes.INTERNAL_SERVER_ERROR,
			);
		}
	}

	// Update Password
	async updatePassword(
		userId: string,
		oldPassword: string,
		newPassword: string,
	): Promise<ServiceResponse<UpdatePasswordResponseData | null>> {
		try {
			const user = await this.authRepository.findById(userId);
			if (!user || !user.password) {
				return ServiceResponse.failure("User not found", null, StatusCodes.NOT_FOUND);
			}

			const passwordMatches = await bcrypt.compare(oldPassword, user.password);
			if (!passwordMatches) {
				return ServiceResponse.failure("Old password is incorrect", null, StatusCodes.UNAUTHORIZED);
			}

			const hashedNewPassword = await bcrypt.hash(newPassword, 10);
			await this.authRepository.updateById(userId, { password: hashedNewPassword });

			return ServiceResponse.success("Password updated successfully", null, StatusCodes.OK);
		} catch (ex) {
			const errorMessage = `Error during update password: ${(ex as Error).message}`;
			logger.error(errorMessage);
			return ServiceResponse.failure(
				"An error occurred during update password.",
				null,
				StatusCodes.INTERNAL_SERVER_ERROR,
			);
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

	// Login with Google
	async loginWithGoogle(idToken: string): Promise<ServiceResponse<LoginResponseData | null>> {
		try {
			// Verify the Google ID token
			const googleClientId = env.GOOGLE_CLIENT_ID;
			if (!googleClientId) {
				return ServiceResponse.failure("Google OAuth not configured", null, StatusCodes.SERVICE_UNAVAILABLE);
			}

			// Decode the ID token (in production, verify with Google's API)
			// For now, we'll decode the JWT payload
			const tokenParts = idToken.split(".");
			if (tokenParts.length !== 3) {
				return ServiceResponse.failure("Invalid Google ID token", null, StatusCodes.BAD_REQUEST);
			}

			const payload = JSON.parse(Buffer.from(tokenParts[1], "base64").toString("utf-8"));
			const { sub: googleId, email, name, picture: profilePictureUrl } = payload;

			if (!email || !googleId) {
				return ServiceResponse.failure("Invalid token payload", null, StatusCodes.BAD_REQUEST);
			}

			// Check if user exists by Google ID
			let user = await this.authRepository.findByGoogleId(googleId);

			if (!user) {
				// Check if user exists by email
				user = await this.authRepository.findByEmail(email);

				if (user) {
					// Link Google ID to existing user
					await this.authRepository.updateWithOAuthId(user.id, { googleId, profilePictureUrl });
				} else {
					// Create new user
					user = await this.authRepository.createOAuthUser({
						email,
						name,
						profilePictureUrl,
						googleId,
					});
				}
			}

			const accessToken = signJwt({ userId: user.id, email: user.email });
			const refreshToken = generateRefreshToken();
			const refreshTokenExpiredAt = getRefreshTokenExpiryDate();

			await this.authRepository.createRefreshToken(user.id, refreshToken, refreshTokenExpiredAt);

			return ServiceResponse.success("Google login successful", {
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
			const errorMessage = `Error during Google login: ${(ex as Error).message}`;
			logger.error(errorMessage);
			return ServiceResponse.failure("An error occurred during Google login.", null, StatusCodes.INTERNAL_SERVER_ERROR);
		}
	}

	// Login with GitHub
	async loginWithGitHub(code: string): Promise<ServiceResponse<LoginResponseData | null>> {
		try {
			const clientId = env.GITHUB_CLIENT_ID;
			const clientSecret = env.GITHUB_CLIENT_SECRET;

			if (!clientId || !clientSecret) {
				return ServiceResponse.failure("GitHub OAuth not configured", null, StatusCodes.SERVICE_UNAVAILABLE);
			}

			// Exchange code for access token
			const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
				},
				body: JSON.stringify({
					client_id: clientId,
					client_secret: clientSecret,
					code,
				}),
			});

			const tokenData = (await tokenResponse.json()) as { access_token?: string; error?: string };
			if (!tokenData.access_token) {
				return ServiceResponse.failure("Failed to get GitHub access token", null, StatusCodes.UNAUTHORIZED);
			}

			// Get user info from GitHub
			const userResponse = await fetch("https://api.github.com/user", {
				headers: {
					Authorization: `Bearer ${tokenData.access_token}`,
					Accept: "application/json",
				},
			});

			const githubUser = (await userResponse.json()) as {
				id: number;
				email: string | null;
				name: string | null;
				avatar_url: string;
			};

			// Get email if not public
			let email = githubUser.email;
			if (!email) {
				const emailResponse = await fetch("https://api.github.com/user/emails", {
					headers: {
						Authorization: `Bearer ${tokenData.access_token}`,
						Accept: "application/json",
					},
				});
				const emails = (await emailResponse.json()) as { email: string; primary: boolean }[];
				const primaryEmail = emails.find((e) => e.primary);
				email = primaryEmail?.email ?? null;
			}

			if (!email) {
				return ServiceResponse.failure("Could not retrieve email from GitHub", null, StatusCodes.BAD_REQUEST);
			}

			const githubId = String(githubUser.id);

			// Check if user exists by GitHub ID
			let user = await this.authRepository.findByGitHubId(githubId);

			if (!user) {
				// Check if user exists by email
				user = await this.authRepository.findByEmail(email);

				if (user) {
					// Link GitHub ID to existing user
					await this.authRepository.updateWithOAuthId(user.id, {
						githubId,
						profilePictureUrl: githubUser.avatar_url,
					});
				} else {
					// Create new user
					user = await this.authRepository.createOAuthUser({
						email,
						name: githubUser.name ?? undefined,
						profilePictureUrl: githubUser.avatar_url,
						githubId,
					});
				}
			}

			const accessToken = signJwt({ userId: user.id, email: user.email });
			const refreshToken = generateRefreshToken();
			const refreshTokenExpiredAt = getRefreshTokenExpiryDate();

			await this.authRepository.createRefreshToken(user.id, refreshToken, refreshTokenExpiredAt);

			return ServiceResponse.success("GitHub login successful", {
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
			const errorMessage = `Error during GitHub login: ${(ex as Error).message}`;
			logger.error(errorMessage);
			return ServiceResponse.failure("An error occurred during GitHub login.", null, StatusCodes.INTERNAL_SERVER_ERROR);
		}
	}
}

export const authService = new AuthService();
