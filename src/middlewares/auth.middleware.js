import { verifyToken } from "../utils/token.js";
import User from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * protect — Verifies JWT from cookie.
 * Sets req.userId (string). Does NOT hit the database.
 * Use this on all authenticated routes.
 */
export const protect = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return next(new ApiError(401, "Not authenticated"));

  const decoded = verifyToken(token);
  if (!decoded?.userId) return next(new ApiError(401, "Invalid or expired session"));

  req.userId = decoded.userId;
  next();
};

/**
 * loadUser — Fetches the full user doc from DB and sets req.user.
 * Use this only on routes that actually need profile data.
 * Must be placed after protect().
 */
export const loadUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select("-password -otp -otpExpires");
    if (!user) return next(new ApiError(401, "Account not found"));
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * isAdmin — Role-gate. Requires loadUser to have run first.
 */
export const isAdmin = (req, res, next) => {
  if (req.user?.role === "admin") return next();
  next(new ApiError(403, "Admin access required"));
};

/**
 * isSubAdmin — Allows admin or sub-admin.
 */
export const isSubAdmin = (req, res, next) => {
  if (["admin", "sub-admin"].includes(req.user?.role)) return next();
  next(new ApiError(403, "Insufficient permissions"));
};
