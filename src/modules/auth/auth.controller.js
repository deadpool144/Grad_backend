import * as authService from "./auth.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

export const register = asyncHandler(async (req, res) => {
  const data = await authService.register(req.body);
  res.status(201).json(new ApiResponse(201, data, "Verification code sent to your email."));
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const data = await authService.verifyOtp(req.body, res);
  res.json(new ApiResponse(200, data, "Email verified — welcome!"));
});

export const resendOtp = asyncHandler(async (req, res) => {
  await authService.resendOtp(req.body.email);
  res.json(new ApiResponse(200, null, "New verification code sent."));
});

export const login = asyncHandler(async (req, res) => {
  const data = await authService.login(req.body, res);
  res.json(new ApiResponse(200, data, "Logged in successfully."));
});

export const logout = asyncHandler(async (req, res) => {
  authService.logout(res);
  res.json(new ApiResponse(200, null, "Logged out."));
});

export const forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body.email);
  // Always return 200 regardless of whether the email exists (anti-enumeration)
  res.json(new ApiResponse(200, null, "If that email is registered, a reset code has been sent."));
});

export const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body);
  res.json(new ApiResponse(200, null, "Password reset successfully."));
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.userId);
  res.json(new ApiResponse(200, user));
});
