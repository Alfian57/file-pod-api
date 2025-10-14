import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

export const LoginRequestSchema = z.object({
    body: z.object({
        email: z.string().email("Invalid email format"),
        password: z.string().min(1, "Password is required"),
    }),
});

export const RegisterRequestSchema = z.object({
    body: z.object({
        name: z.string().optional(),
        email: z.string().email("Invalid email format"),
        password: z.string().min(6, "Password must be at least 6 characters"),
    }),
});

export const LoginResponseSchema = z.object({
    token: z.string(),
});

export const RegisterResponseDataSchema = z.null();