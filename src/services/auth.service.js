import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { generateTokenAndSetCookie } from "../utils/token.js";
import { sendOtpEmail, sendPasswordResetEmail } from "./email.service.js";

const makeOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// Register — handles new users AND users who left mid-flow (unverified)
export const register = async ({ firstName, lastName, email, password }, res) => {
  const existing = await User.findOne({ email });

  if (existing?.isVerified) {
    throw new ApiError(400, "Email already registered. Please log in.");
  }

  const hashed = await bcrypt.hash(password, 10);
  const otp = makeOtp();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

  if (existing) {
    // Resume: user left before verifying — update credentials, resend OTP
    existing.firstName = firstName;
    existing.lastName = lastName;
    existing.password = hashed;
    existing.otp = otp;
    existing.otpExpires = otpExpires;
    await existing.save();
  } else {
    await User.create({ firstName, lastName, email, password: hashed, otp, otpExpires });
  }

  await sendOtpEmail(email, otp);
  return { email };
};

// Verify OTP — auto log-in after success
export const verifyOtp = async ({ email, otp }, res) => {
  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "User not found");
  if (user.isVerified) throw new ApiError(400, "Already verified — please log in");
  if (user.otp !== otp || user.otpExpires < new Date()) {
    throw new ApiError(400, "Invalid or expired OTP");
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
  };
};

// Resend OTP — for both registration and password reset flows
export const resendOtp = async (email) => {
  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "User not found");
  if (user.isVerified) throw new ApiError(400, "Account already verified");

  const otp = makeOtp();
  user.otp = otp;
  user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();

  await sendOtpEmail(email, otp);
};

// Login
export const login = async ({ email, password }, res) => {
  const user = await User.findOne({ email });
  if (!user) throw new ApiError(400, "Invalid email or password");
  if (!user.isVerified) throw new ApiError(401, "Please verify your email first");

  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new ApiError(400, "Invalid email or password");

  generateTokenAndSetCookie(user._id, res);
  return {
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
  };
};

// Forgot password — send OTP to verified email
export const forgotPassword = async (email) => {
  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "No account found with that email");

  const otp = makeOtp();
  user.otp = otp;
  user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();

  await sendPasswordResetEmail(email, otp);
};

// Reset password — verify OTP then update password
export const resetPassword = async ({ email, otp, newPassword }) => {
  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "User not found");
  if (user.otp !== otp || user.otpExpires < new Date()) {
    throw new ApiError(400, "Invalid or expired OTP");
  }

  user.password = await bcrypt.hash(newPassword, 10);
  user.otp = undefined;
  user.otpExpires = undefined;
  await user.save();
};

// Get me (used by /auth/me)
export const getMe = async (userId) => {
  const user = await User.findById(userId).select("-password -otp -otpExpires");
  if (!user) throw new ApiError(404, "User not found");
  return user;
};
