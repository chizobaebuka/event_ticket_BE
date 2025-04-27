import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';


export const generateValidToken = () => {
    const userPayload = { id: uuidv4(), email: 'user@example.com' }; 
    return jwt.sign(userPayload, process.env.JWT_SECRET_KEY as string, { expiresIn: '1h' });
}