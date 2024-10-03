import { Router } from "express";
import { getAllUsers, loginUser, registerUser } from "../controllers/user.controller";

const userRouter = Router();

userRouter.post("/register", registerUser);
userRouter.post("/login", loginUser);
userRouter.get("/", getAllUsers);

export default userRouter;