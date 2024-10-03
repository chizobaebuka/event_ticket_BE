import { ICore } from ".";

export interface IUser extends ICore {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    country: string;
    email: string;
    password: string;
}

export interface ISignupRequest {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    country: string;
    email: string;
    password: string;
}