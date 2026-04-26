import { randomInt } from "crypto";

/** OTP validity window in milliseconds (10 minutes) */
export const OTP_TTL_MS = 10 * 60 * 1000;

/**
 * Generate a cryptographically secure 6-digit OTP.
 * Uses Node's `crypto.randomInt` instead of Math.random.
 * @returns {string} 6-digit string
 */
export const generateOtp = () => randomInt(100_000, 1_000_000).toString();

/**
 * Return the OTP expiry Date (now + OTP_TTL_MS).
 * @returns {Date}
 */
export const otpExpiry = () => new Date(Date.now() + OTP_TTL_MS);

/**
 * Check whether an OTP is still valid.
 * @param {string} storedOtp
 * @param {Date}   storedExpiry
 * @param {string} submittedOtp
 * @returns {boolean}
 */
export const isOtpValid = (storedOtp, storedExpiry, submittedOtp) =>
  storedOtp === submittedOtp && new Date(storedExpiry) > new Date();
