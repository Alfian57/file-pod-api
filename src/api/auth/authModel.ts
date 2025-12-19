import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

// Login
export const LoginRequestSchema = z.object({
	body: z.object({
		email: z.string().email("Invalid email format"),
		password: z.string().min(1, "Password is required"),
	}),
});
export const LoginResponseSchema = z.object({
	accessToken: z.string(),
	refreshToken: z.string(),
	user: z.object({
		name: z.string().optional(),
		email: z.string().email(),
		profilePictureUrl: z.string().url().optional(),
		storageQuotaBytes: z.number().optional(),
		storageUsedBytes: z.number().optional(),
	}),
});
export type LoginResponseData = z.infer<typeof LoginResponseSchema>;

// Register
export const RegisterRequestSchema = z.object({
	body: z.object({
		name: z.string().optional(),
		email: z.string().email("Invalid email format"),
		password: z.string().min(6, "Password must be at least 6 characters"),
	}),
});
export const RegisterResponseSchema = z.null();
export type RegisterResponseData = z.infer<typeof RegisterResponseSchema>;

// Refresh Token
export const RefreshTokenRequestSchema = z.object({
	body: z.object({
		refreshToken: z.string().min(1, "Refresh token is required"),
	}),
});
export const RefreshTokenResponseSchema = z.object({
	accessToken: z.string(),
	refreshToken: z.string(),
});
export type RefreshTokenResponseData = z.infer<typeof RefreshTokenResponseSchema>;

// Logout
export const LogoutRequestSchema = z.object({
	body: z.object({
		refreshToken: z.string().min(1, "Refresh token is required"),
	}),
});
export const LogoutResponseSchema = z.null();
export type LogoutResponseData = z.infer<typeof LogoutResponseSchema>;

// Update Profile
export const UpdateProfileResponseSchema = z.null();
export type UpdateProfileResponseData = z.infer<typeof UpdateProfileResponseSchema>;

// Update Password
export const UpdatePasswordRequestSchema = z.object({
	body: z.object({
		oldPassword: z.string().min(1, "Old password is required"),
		newPassword: z.string().min(6, "New password must be at least 6 characters"),
	}),
});
export const UpdatePasswordResponseSchema = z.null();
export type UpdatePasswordResponseData = z.infer<typeof UpdatePasswordResponseSchema>;

// Get Current User
export const GetCurrentUserResponseSchema = z.object({
	name: z.string().optional(),
	email: z.string().email(),
	profilePictureUrl: z.string().url().optional(),
	storageQuotaBytes: z.number().optional(),
	storageUsedBytes: z.number().optional(),
});
export type GetCurrentUserResponseData = z.infer<typeof GetCurrentUserResponseSchema>;

// OAuth - Google Login
export const GoogleLoginRequestSchema = z.object({
	body: z.object({
		idToken: z.string().min(1, "Google ID token is required"),
	}),
});
export type GoogleLoginResponseData = LoginResponseData;

// OAuth - GitHub Login
export const GitHubLoginRequestSchema = z.object({
	body: z.object({
		code: z.string().min(1, "GitHub authorization code is required"),
	}),
});
export type GitHubLoginResponseData = LoginResponseData;
