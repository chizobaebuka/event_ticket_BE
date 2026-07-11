import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import UserModel from '../db/models/usermodel';
import { env } from '../config/env';
import { ConflictError, UnauthorizedError } from '../errors/AppError';
import { PublicUser } from '../interfaces/user.interface';
import { LoginUserInput, SignUpUserInput } from '../utils/validator';

const SALT_ROUNDS = 10;

const toPublicUser = (user: UserModel): PublicUser => ({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    country: user.country,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
});

export const registerUser = async (input: SignUpUserInput): Promise<PublicUser> => {
    const { firstName, lastName, country, email, password } = input;

    const existingUser = await UserModel.findOne({ where: { email } });
    if (existingUser) {
        throw new ConflictError('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const newUser = await UserModel.create({ firstName, lastName, country, email, password: hashedPassword });

    return toPublicUser(newUser);
};

export const loginUser = async (input: LoginUserInput): Promise<{ token: string }> => {
    const { email, password } = input;

    const user = await UserModel.findOne({ where: { email } });
    if (!user) {
        throw new UnauthorizedError('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        throw new UnauthorizedError('Invalid email or password');
    }

    const token = jwt.sign({ id: user.id, email: user.email }, env.JWT_SECRET_KEY, {
        expiresIn: env.JWT_EXPIRES_IN,
    });

    return { token };
};

export const listUsers = async (
    page: number,
    pageSize: number
): Promise<{ users: PublicUser[]; total: number }> => {
    const { rows, count } = await UserModel.findAndCountAll({
        attributes: { exclude: ['password'] },
        limit: pageSize,
        offset: (page - 1) * pageSize,
        order: [['createdAt', 'DESC']],
    });

    return { users: rows.map(toPublicUser), total: count };
};
