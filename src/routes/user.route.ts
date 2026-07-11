import { Router } from 'express';
import { getAllUsers, loginUser, registerUser } from '../controllers/user.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { loginUserSchema, signUpUserSchema } from '../utils/validator';

const userRouter = Router();

userRouter.post('/register', validateBody(signUpUserSchema), registerUser);
userRouter.post('/login', validateBody(loginUserSchema), loginUser);
userRouter.get('/', authenticateToken, getAllUsers);

export default userRouter;
