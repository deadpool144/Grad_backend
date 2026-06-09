import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

// ── Routes (new modular structure) ───────────────────────────────────────────
import authRoutes from "./modules/auth/auth.routes.js";
import userRoutes from "./modules/users/user.routes.js";
import postRoutes from "./modules/posts/post.routes.js";
import messageRoutes from "./modules/messages/message.routes.js";
import eventRoutes from "./modules/events/event.routes.js";
import notificationRoutes from "./modules/notifications/notification.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import aiRoutes from "./modules/ai/ai.routes.js";

import errorHandler from "./middlewares/error.middleware.js";
import { apiLimiter } from "./middlewares/rateLimiter.middleware.js";

const app = express();

// Trust proxy for secure cookies in production (Render/Vercel)
app.set("trust proxy", 1);

// ── Core Middleware ───────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:3000",
  "http://127.0.0.1:3000"
].filter(Boolean).map(origin => origin.replace(/\/$/, "")); // Remove trailing slashes

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.replace(/\/$/, "");
    if (allowedOrigins.includes(normalizedOrigin) || process.env.NODE_ENV !== "production") {
      return callback(null, true);
    }

    console.error(`[CORS Blocked] Origin: ${origin}, Allowed: ${allowedOrigins.join(", ")}`);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Global Rate Limit ────────────────────────────────────────────────────────
app.use("/api", apiLimiter);

// ── Health Check ─────────────────────────────────────────────────────────────
app.get("/", (_, res) => res.json({ message: "Alumni Connect API v2 ✅" }));
app.get("/api", (_, res) => res.json({
  message: "Alumni Connect API v2",
  version: "2.0.0",
  status: "running",
}));

// ── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ai", aiRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found.` });
});

// ── Global Error Handler (must be last) ──────────────────────────────────────
app.use(errorHandler);

export default app;
