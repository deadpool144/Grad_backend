import bcrypt from "bcryptjs";
import User from "../../models/User.js";
import { ApiError } from "../../utils/ApiError.js";
import { generateTokenAndSetCookie, clearAuthCookie } from "../../utils/token.js";
import { generateOtp, otpExpiry, isOtpValid } from "../../utils/otp.js";
import { sendOtpEmail, sendPasswordResetEmail } from "../notifications/email.service.js";

/**
 * Register a new user and send verification OTP.
 */
export const register = async ({ firstName, lastName, email, password }) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(400, "User with this email already exists.");
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const otp = generateOtp();
  const expires = otpExpiry();

  const user = await User.create({
    firstName,
    lastName,
    email,
    password: hashedPassword,
    otp,
    otpExpires: expires,
  });

  await sendOtpEmail(email, otp);

  return {
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified,
  };
};

/**
 * Verify OTP and activate account.
 */
export const verifyOtp = async ({ email, otp }, res) => {
  const user = await User.findOne({ email }).select("+otp +otpExpires");
  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  if (!isOtpValid(user.otp, user.otpExpires, otp)) {
    throw new ApiError(400, "Invalid or expired verification code.");
  }

  if (user.isBlocked) {
    throw new ApiError(403, "Your account has been suspended. Please contact support.");
  }

  user.isVerified = true;
  user.otp = undefined;
  user.otpExpires = undefined;
  await user.save();

  generateTokenAndSetCookie(user._id, res);

  return {
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    headline: user.headline,
    isVerified: true,
  };
};

/**
 * Resend verification OTP.
 */
export const resendOtp = async (email) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  if (user.isVerified) {
    throw new ApiError(400, "Email is already verified.");
  }

  const otp = generateOtp();
  user.otp = otp;
  user.otpExpires = otpExpiry();
  await user.save();

  await sendOtpEmail(email, otp);
};

/**
 * Log in a user.
 */
export const login = async ({ email, password }, res) => {
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    throw new ApiError(401, "Invalid email or password.");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new ApiError(401, "Invalid email or password.");
  }

  if (!user.isVerified) {
    throw new ApiError(401, "Email not verified. Please check your inbox for the OTP.");
  }

  if (user.isBlocked) {
    throw new ApiError(403, "Your account has been suspended. Please contact support.");
  }

  generateTokenAndSetCookie(user._id, res);

  return {
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    headline: user.headline,
    isVerified: true,
  };
};

/**
 * Log out a user.
 */
export const logout = (res) => {
  clearAuthCookie(res);
};

/**
 * Trigger password reset flow.
 */
export const forgotPassword = async (email) => {
  const user = await User.findOne({ email });
  if (!user) return; // Silent return for security

  const otp = generateOtp();
  user.otp = otp;
  user.otpExpires = otpExpiry();
  await user.save();

  await sendPasswordResetEmail(email, otp);
};

/**
 * Reset password using OTP.
 */
export const resetPassword = async ({ email, otp, newPassword }) => {
  const user = await User.findOne({ email }).select("+otp +otpExpires");
  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  if (!isOtpValid(user.otp, user.otpExpires, otp)) {
    throw new ApiError(400, "Invalid or expired reset code.");
  }

  user.password = await bcrypt.hash(newPassword, 12);
  user.otp = undefined;
  user.otpExpires = undefined;
  await user.save();
};

/**
 * Get current user profile.
 */
export const getMe = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found.");
  }
  return user;
};
