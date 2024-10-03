import { Router } from "express";
import { loginUser, registerUser } from "../controllers/user.controller";
// import { auth } from "../middlewares/auth";

const userRouter = Router();

userRouter.post("/register", registerUser);
userRouter.post("/login", loginUser);
// router.post("/forgotPassword1", forgotPassword1);
// router.post("/verifyUser1", verifyUserRegistration);
// router.post("/resetPassword1", userResetPassword);
// router.put("/updateEmail", updateUserEmail);
// router.put("/updateUsername", updateUserUsername);
// router.post("/logoutUser", logoutUser)

export default userRouter;