import bcrypt from "bcryptjs";
import User from "../../models/User.js";
import { ApiError } from "../../utils/ApiError.js";
import { generateTokenAndSetCookie, clearAuthCookie } from "../../utils/token.js";
import { generateOtp, otpExpiry, isOtpValid, OTP_TTL_MS } from "../../utils/otp.js";
import { sendOtpEmail, sendPasswordResetEmail } from "../notifications/email.service.js";

// ─────────────────────────────────────────────────────────────────────────────
// REGISTER
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Registration flow (handles re-registration gracefully):
 *
 * Case A: Email is VERIFIED → reject (user should log in)
 * Case B: Email exists but is UNVERIFIED and OTP is still valid → reject with
 *         "check your email" message (prevents account hijack)
 * Case C: Email exists but is UNVERIFIED and OTP has expired → allow re-registration
 *         (user abandoned the flow; update the doc atomically)
 * Case D: Email does not exist → create new user
 *
 * In all allowed cases we atomically upsert to avoid concurrency issues.
 */
export const register = async ({ firstName, lastName, email, password }) => {
  const existing = await User.findOne({ email }).select("+otp +otpExpires");

  if (existing?.isVerified) {
    throw new ApiError(409, "Email already registered. Please log in.");
  }

  if (existing && !existing.isVerified) {
    // OTP still valid — don't overwrite, user should check their email
    if (existing.otpExpires && existing.otpExpires > new Date()) {
      const minutesLeft = Math.ceil((existing.otpExpires - Date.now()) / 60_000);
      throw new ApiError(
        409,
        `A verification email was already sent. Please check your inbox or wait ${minutesLeft} minute(s) to request a new one.`
      );
    }
    // OTP expired — safe to let them re-register (update existing doc)
  }

  const hashed = await bcrypt.hash(password, 12);
  const otp    = generateOtp();
  const expiry = otpExpiry();

  // Atomic upsert: creates if missing, updates if (email + !isVerified) matches
  await User.findOneAndUpdate(
    { email, isVerified: false },
    {
      $set: {
        firstName, lastName,
        password: hashed,
        otp, otpExpires: expiry,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await sendOtpEmail(email, otp);
  return { email };
};

// ─────────────────────────────────────────────────────────────────────────────
// VERIFY OTP
// ─────────────────────────────────────────────────────────────────────────────
export const verifyOtp = async ({ email, otp }, res) => {
  const user = await User.findOne({ email }).select("+otp +otpExpires");
  if (!user)            throw new ApiError(404, "No account found with that email.");
  if (user.isVerified)  throw new ApiError(400, "Account is already verified. Please log in.");

  if (!isOtpValid(user.otp, user.otpExpires, otp)) {
    throw new ApiError(400, "Invalid or expired verification code.");
  }

  // Mark verified, clear OTP fields
  user.isVerified  = true;
  user.otp         = undefined;
  user.otpExpires  = undefined;
  await user.save();

  generateTokenAndSetCookie(user._id, res);

  return {
    _id:       user._id,
    firstName: user.firstName,
    lastName:  user.lastName,
    email:     user.email,
    role:      user.role,
    avatar:    user.avatar,
    headline:  user.headline,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// RESEND OTP
// ─────────────────────────────────────────────────────────────────────────────
export const resendOtp = async (email) => {
  const user = await User.findOne({ email }).select("+otp +otpExpires");
  if (!user)           throw new ApiError(404, "No account found with that email.");
  if (user.isVerified) throw new ApiError(400, "Account is already verified.");

  const otp = generateOtp();
  user.otp       = otp;
  user.otpExpires = otpExpiry();
  await user.save();

  await sendOtpEmail(email, otp);
};

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────────────────────
export const login = async ({ email, password }, res) => {
  const user = await User.findOne({ email }).select("+password");
  // Use the same error message for both "user not found" and "wrong password"
  // to prevent user enumeration attacks
  const INVALID_MSG = "Invalid email or password.";
  if (!user) throw new ApiError(400, INVALID_MSG);
  if (!user.isVerified) {
    throw new ApiError(401, "Email not verified. Please check your inbox for the OTP.");
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new ApiError(400, INVALID_MSG);

  generateTokenAndSetCookie(user._id, res);

  return {
    _id:       user._id,
    firstName: user.firstName,
    lastName:  user.lastName,
    email:     user.email,
    role:      user.role,
    avatar:    user.avatar,
    headline:  user.headline,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────────────────────────────────────
export const logout = (res) => {
  clearAuthCookie(res);
};

// ─────────────────────────────────────────────────────────────────────────────
// FORGOT PASSWORD
// ─────────────────────────────────────────────────────────────────────────────
export const forgotPassword = async (email) => {
  const user = await User.findOne({ email, isVerified: true });
  // Always respond the same way to avoid email enumeration
  if (!user) return;

  const otp = generateOtp();
  user.otp       = otp;
  user.otpExpires = otpExpiry();
  await user.save();

  await sendPasswordResetEmail(email, otp);
};

// ─────────────────────────────────────────────────────────────────────────────
// RESET PASSWORD
// ─────────────────────────────────────────────────────────────────────────────
export const resetPassword = async ({ email, otp, newPassword }) => {
  const user = await User.findOne({ email }).select("+otp +otpExpires");
  if (!user) throw new ApiError(404, "No account found with that email.");

  if (!isOtpValid(user.otp, user.otpExpires, otp)) {
    throw new ApiError(400, "Invalid or expired reset code.");
  }

  user.password   = await bcrypt.hash(newPassword, 12);
  user.otp        = undefined;
  user.otpExpires = undefined;
  await user.save();
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ME
// ─────────────────────────────────────────────────────────────────────────────
export const getMe = async (userId) => {
  const user = await User.findById(userId).select("-password -otp -otpExpires");
  if (!user) throw new ApiError(404, "User not found.");
  return user;
};
