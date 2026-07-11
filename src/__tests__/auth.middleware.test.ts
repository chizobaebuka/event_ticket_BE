import { Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.middleware';
import { generateValidToken } from '../utils/helpers';

describe('authenticateToken', () => {
    let mockResponse: Partial<Response>;
    let statusMock: jest.Mock;
    let jsonMock: jest.Mock;
    let nextMock: jest.Mock;

    beforeEach(() => {
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        mockResponse = { status: statusMock };
        nextMock = jest.fn();
    });

    it('rejects requests with no token', () => {
        const req = { headers: {} } as AuthenticatedRequest;

        authenticateToken(req, mockResponse as Response, nextMock);

        expect(statusMock).toHaveBeenCalledWith(401);
        expect(nextMock).not.toHaveBeenCalled();
    });

    it('rejects requests with an invalid token', () => {
        const req = { headers: { authorization: 'Bearer not-a-real-token' } } as AuthenticatedRequest;

        authenticateToken(req, mockResponse as Response, nextMock);

        expect(statusMock).toHaveBeenCalledWith(403);
        expect(nextMock).not.toHaveBeenCalled();
    });

    it('attaches the decoded user and calls next() for a valid token', () => {
        const token = generateValidToken();
        const req = { headers: { authorization: `Bearer ${token}` } } as AuthenticatedRequest;

        authenticateToken(req, mockResponse as Response, nextMock);

        expect(nextMock).toHaveBeenCalled();
        expect(req.user).toEqual(expect.objectContaining({ email: 'user@example.com' }));
    });
});
