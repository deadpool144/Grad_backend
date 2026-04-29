import jwt from "jsonwebtoken";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === "production" || process.env.CLIENT_URL?.includes("https"),
  sameSite: process.env.NODE_ENV === "production" || process.env.CLIENT_URL?.includes("https") ? "none" : "lax",
  maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
  path:     "/",
};

/**
 * Sign a JWT, set it as an httpOnly cookie, and return the token string.
 * @param {string} userId
 * @param {import("express").Response} res
 * @returns {string} signed JWT
 */
export const generateTokenAndSetCookie = (userId, res) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
  res.cookie("token", token, COOKIE_OPTIONS);
  return token;
};

/**
 * Clear the auth cookie (logout).
 * @param {import("express").Response} res
 */
export const clearAuthCookie = (res) => {
  res.clearCookie("token", { ...COOKIE_OPTIONS, maxAge: 0 });
};

/**
 * Verify a JWT and return the decoded payload, or null on failure.
 * @param {string} token
 * @returns {{ userId: string } | null}
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
};
