import { ApiError } from "../utils/ApiError.js";
import multer from "multer";

/**
 * Global Express error handler — must be the LAST middleware in app.js.
 * Normalises all error shapes into a consistent JSON response.
 */
const errorHandler = (err, req, res, next) => {
  // --- Defaults ---
  let statusCode = err.statusCode || 500;
  let message    = err.message    || "Internal Server Error";
  let errors     = err.errors     || [];

  // --- Mongoose: invalid ObjectId ---
  if (err.name === "CastError") {
    statusCode = 400;
    message    = `Invalid ${err.path}: ${err.value}`;
  }

  // --- Mongoose: validation errors ---
  if (err.name === "ValidationError") {
    statusCode = 400;
    errors     = Object.values(err.errors).map((e) => e.message);
    message    = errors[0] || "Validation failed";
  }

  // --- Mongoose: duplicate key ---
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || "field";
    message     = `${field} already exists`;
  }

  // --- JWT errors ---
  if (err.name === "JsonWebTokenError") { statusCode = 401; message = "Invalid token"; }
  if (err.name === "TokenExpiredError") { statusCode = 401; message = "Session expired. Please log in again."; }

  // --- Multer: file too large ---
  if (err instanceof multer.MulterError) {
    statusCode = 400;
    message = err.code === "LIMIT_FILE_SIZE"
      ? "File too large. Maximum size is 50 MB."
      : err.message;
  }

  // --- Hide secrets from error messages in production ---
  if (process.env.NODE_ENV === "production") {
    const lowerMsg = message.toLowerCase();
    if (
      lowerMsg.includes("api_key") ||
      lowerMsg.includes("api_secret") ||
      lowerMsg.includes("cloud_name") ||
      lowerMsg.includes("mongodb")
    ) {
      message = "An internal service error occurred. Please try again.";
    }
  }

  // Never log 4xx as errors — they're client mistakes
  if (statusCode >= 500) {
    console.error("[ERROR]", req.method, req.path, err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(errors.length > 0 && { errors }),
  });
};

export default errorHandler;
