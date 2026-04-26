import { Router } from "express";
import * as auth from "./auth.controller.js";
import { protect } from "../../middlewares/auth.middleware.js";
import { authLimiter, otpLimiter } from "../../middlewares/rateLimiter.middleware.js";

const router = Router();

// Public routes (rate-limited)
router.post("/register",        authLimiter, auth.register);
router.post("/verify-otp",      authLimiter, auth.verifyOtp);
router.post("/resend-otp",      otpLimiter,  auth.resendOtp);
router.post("/login",           authLimiter, auth.login);
router.post("/forgot-password", authLimiter, auth.forgotPassword);
router.post("/reset-password",  authLimiter, auth.resetPassword);

// Protected
router.post("/logout", protect, auth.logout);
router.get("/me",      protect, auth.getMe);

export default router;
