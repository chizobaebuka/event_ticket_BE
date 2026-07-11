import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import UserModel from '../db/models/usermodel';
import * as userService from '../services/user.service';

jest.mock('../db/models/usermodel');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('user.service', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('registerUser', () => {
        const input = {
            firstName: 'Ada',
            lastName: 'Lovelace',
            country: 'UK',
            email: 'ada@example.com',
            password: 'supersecret',
        };

        it('throws a conflict error when the email is already registered', async () => {
            (UserModel.findOne as jest.Mock).mockResolvedValue({ id: 'existing' });

            await expect(userService.registerUser(input)).rejects.toMatchObject({ statusCode: 409 });
            expect(UserModel.create).not.toHaveBeenCalled();
        });

        it('hashes the password and never returns it', async () => {
            (UserModel.findOne as jest.Mock).mockResolvedValue(null);
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
            (UserModel.create as jest.Mock).mockResolvedValue({
                id: 'new-user',
                firstName: input.firstName,
                lastName: input.lastName,
                country: input.country,
                email: input.email,
                password: 'hashed-password',
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            const user = await userService.registerUser(input);

            expect(bcrypt.hash).toHaveBeenCalledWith(input.password, 10);
            expect(UserModel.create).toHaveBeenCalledWith(
                expect.objectContaining({ email: input.email, password: 'hashed-password' })
            );
            expect(user).not.toHaveProperty('password');
        });
    });

    describe('loginUser', () => {
        const credentials = { email: 'ada@example.com', password: 'supersecret' };

        it('throws unauthorized when the user does not exist', async () => {
            (UserModel.findOne as jest.Mock).mockResolvedValue(null);

            await expect(userService.loginUser(credentials)).rejects.toMatchObject({ statusCode: 401 });
        });

        it('throws unauthorized when the password does not match', async () => {
            (UserModel.findOne as jest.Mock).mockResolvedValue({ id: 'u1', password: 'hashed' });
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            await expect(userService.loginUser(credentials)).rejects.toMatchObject({ statusCode: 401 });
        });

        it('returns a signed token on successful login', async () => {
            (UserModel.findOne as jest.Mock).mockResolvedValue({
                id: 'u1',
                email: credentials.email,
                password: 'hashed',
            });
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            (jwt.sign as jest.Mock).mockReturnValue('signed-token');

            const result = await userService.loginUser(credentials);

            expect(result).toEqual({ token: 'signed-token' });
        });
    });

    describe('listUsers', () => {
        it('paginates and never includes the password attribute', async () => {
            (UserModel.findAndCountAll as jest.Mock).mockResolvedValue({
                rows: [
                    {
                        id: 'u1',
                        firstName: 'Ada',
                        lastName: 'Lovelace',
                        country: 'UK',
                        email: 'ada@example.com',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                ],
                count: 1,
            });

            const result = await userService.listUsers(1, 20);

            expect(UserModel.findAndCountAll).toHaveBeenCalledWith(
                expect.objectContaining({ attributes: { exclude: ['password'] }, limit: 20, offset: 0 })
            );
            expect(result.total).toBe(1);
            expect(result.users[0]).not.toHaveProperty('password');
        });
    });
});
