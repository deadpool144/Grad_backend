import { Router } from "express";
import * as auth from "../controllers/auth.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/register",        auth.register);
router.post("/verify-otp",      auth.verifyOtp);
router.post("/resend-otp",      auth.resendOtp);
router.post("/login",           auth.login);
router.post("/logout",          auth.logout);
router.post("/forgot-password", auth.forgotPassword);
router.post("/reset-password",  auth.resetPassword);
router.get("/me",               protect, auth.getMe);

export default router;
