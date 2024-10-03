import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import UserModel from '../db/models/usermodel';
import { signUpUserSchema } from '../utils/validator';

dotenv.config(); // Make sure to load your environment variables

interface RequestExt extends Request {
    user?: {
        id: string;
        email: string;
    };
}

export const registerUser: (req: Request, res: Response) => Promise<void> = async (req, res) => {
    try {
        const validation = signUpUserSchema.safeParse(req.body);
        if(!validation.success) {
            res.status(400).json({ error: validation.error.errors });
        };
        
        const { firstName, lastName, country, email, password } = req.body;

        const existingUser = await UserModel.findOne({ where: { email } });
        if (existingUser) {
            res.status(409).json({ message: 'User already exists' });
            return;
        }

        // Hash the password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create a new user
        const newUser = new UserModel({
            firstName,
            lastName,
            country,
            email,
            password: hashedPassword,
        });

        await newUser.save();

        // Return user information in the response
        const userResponse = {
            id: newUser.id,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            email: newUser.email,
        };

        res.status(201).json({ status: 'success', message: 'Registration successful', user: userResponse });
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        const user = await UserModel.findOne({ where: { email } });
        if (!user) {
            res.status(401).json({ message: 'Invalid email or password' });
            return;
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            res.status(401).json({ message: 'Invalid email or password' });
            return;
        }

        // Generate a JWT token
        const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET_KEY as string, {
            expiresIn: process.env.JWT_EXPIRES_IN,
        });

        res.status(200).json({ status: 'success', message: 'Login successful', token });
    } catch (error: any) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
}
