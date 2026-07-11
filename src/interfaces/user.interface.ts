import { ICore } from '.';

export interface IUser extends ICore {
    firstName: string;
    lastName: string;
    country: string;
    email: string;
    password: string;
}

export type PublicUser = Omit<IUser, 'password'>;
