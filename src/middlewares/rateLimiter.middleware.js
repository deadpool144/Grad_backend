import rateLimit from "express-rate-limit";

const json429 = (req, res) =>
  res.status(429).json({ success: false, message: "Too many requests. Please slow down." });

/**
 * Auth limiter — strict for login/register/forgot-password.
 * 10 attempts per 15 minutes per IP.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: json429,
});

/**
 * OTP limiter — very strict. 4 attempts per 10 minutes per IP.
 */
export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 4,
  standardHeaders: true,
  legacyHeaders: false,
  handler: json429,
});

/**
 * General API limiter — applied to all routes. 200 req / minute per IP.
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: json429,
});
