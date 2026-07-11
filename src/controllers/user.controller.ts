import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as userService from '../services/user.service';

export const registerUser = asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.registerUser(req.body);
    res.status(201).json({ status: 'success', message: 'Registration successful', user });
});

export const loginUser = asyncHandler(async (req: Request, res: Response) => {
    const { token } = await userService.loginUser(req.body);
    res.status(200).json({ status: 'success', message: 'Login successful', token });
});

export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));

    const { users, total } = await userService.listUsers(page, pageSize);

    res.status(200).json({
        status: 'success',
        message: 'Successfully fetched users',
        data: users,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
});
