import * as authService from "../services/auth.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const register = asyncHandler(async (req, res) => {
  const data = await authService.register(req.body, res);
  res.status(201).json(new ApiResponse(201, data, "OTP sent to your email"));
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const data = await authService.verifyOtp(req.body, res);
  res.status(200).json(new ApiResponse(200, data, "Email verified — welcome!"));
});

export const resendOtp = asyncHandler(async (req, res) => {
  await authService.resendOtp(req.body.email);
  res.status(200).json(new ApiResponse(200, null, "OTP resent"));
});

export const login = asyncHandler(async (req, res) => {
  const data = await authService.login(req.body, res);
  res.status(200).json(new ApiResponse(200, data, "Logged in"));
});

export const logout = asyncHandler(async (req, res) => {
  res.clearCookie("token", { httpOnly: true, path: "/" });
  res.status(200).json(new ApiResponse(200, null, "Logged out"));
});

export const forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body.email);
  res.status(200).json(new ApiResponse(200, null, "Reset OTP sent to your email"));
});

export const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body);
  res.status(200).json(new ApiResponse(200, null, "Password reset successfully"));
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user._id);
  res.status(200).json(new ApiResponse(200, user, "Authenticated"));
});
