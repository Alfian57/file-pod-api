import type { Request, RequestHandler, Response } from "express";

import { authService } from "@/api/auth/authService";

class AuthController {
	public login: RequestHandler = async (req: Request, res: Response) => {
		const { email, password } = req.body;
		const serviceResponse = await authService.login(email, password);
		res.status(serviceResponse.statusCode).send(serviceResponse);
	};

	public register: RequestHandler = async (req: Request, res: Response) => {
		const { name, email, password } = req.body;
		const serviceResponse = await authService.register(name, email, password);
		res.status(serviceResponse.statusCode).send(serviceResponse);
	};

	public refreshToken: RequestHandler = async (req: Request, res: Response) => {
		const { refreshToken } = req.body;
		const serviceResponse = await authService.refreshToken(refreshToken);
		res.status(serviceResponse.statusCode).send(serviceResponse);
	};

	public logout: RequestHandler = async (req: Request, res: Response) => {
		const { refreshToken } = req.body;
		const serviceResponse = await authService.logout(refreshToken);
		res.status(serviceResponse.statusCode).send(serviceResponse);
	};

	public getCurrentUser: RequestHandler = async (req: Request, res: Response) => {
		const userId = req.user?.userId;
		if (!userId) {
			return res.status(401).send({ statusCode: 401, message: "Unauthorized" });
		}
		const serviceResponse = await authService.getCurrentUser(userId);
		res.status(serviceResponse.statusCode).send(serviceResponse);
	};
}

export const authController = new AuthController();
