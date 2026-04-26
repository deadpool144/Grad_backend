import { Server } from "socket.io";
import { verifyToken } from "../utils/token.js";
import { markRead } from "../modules/messages/message.service.js";

// userId → Set<socketId>  (supports multi-tab)
const onlineUsers = new Map();

/** Broadcast the current online user IDs list */
const broadcastOnline = (io) => {
  io.emit("online_users", [...onlineUsers.keys()]);
};

export const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin:      process.env.CLIENT_URL || "http://localhost:3000",
      credentials: true,
    },
    pingTimeout:  30_000,
    pingInterval: 10_000,
  });

  // ── Authentication middleware (runs once on handshake) ──────────────────
  io.use((socket, next) => {
    try {
      // Accept token from cookie or handshake query (for dev tools / mobile)
      const token =
        socket.handshake.headers?.cookie
          ?.split(";")
          .map((c) => c.trim())
          .find((c) => c.startsWith("token="))
          ?.slice(6) ||
        socket.handshake.auth?.token ||
        socket.handshake.query?.token;

      if (!token) return next(new Error("Authentication required"));

      const decoded = verifyToken(token);
      if (!decoded?.userId) return next(new Error("Invalid token"));

      socket.userId = decoded.userId;
      next();
    } catch {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.userId;

    // ── Presence ──────────────────────────────────────────────────────────
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);
    broadcastOnline(io);

    // Each user joins their personal notification room
    socket.join(`user:${userId}`);

    // ── Conversation rooms ─────────────────────────────────────────────────
    socket.on("join_conv", (convId) => {
      if (convId) socket.join(`conv:${convId}`);
    });

    socket.on("leave_conv", (convId) => {
      if (convId) socket.leave(`conv:${convId}`);
    });

    // ── Typing indicators ─────────────────────────────────────────────────
    socket.on("typing", ({ convId }) => {
      socket.to(`conv:${convId}`).emit("typing", { userId, convId });
    });

    socket.on("stop_typing", ({ convId }) => {
      socket.to(`conv:${convId}`).emit("stop_typing", { userId, convId });
    });

    // ── Mark read ─────────────────────────────────────────────────────────
    socket.on("mark_read", async ({ convId }) => {
      try {
        await markRead(convId, userId);
        socket.to(`conv:${convId}`).emit("messages_read", { convId, userId });
      } catch (err) {
        console.error("[socket] mark_read error:", err.message);
      }
    });

    // ── Disconnect ────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) onlineUsers.delete(userId);
      }
      broadcastOnline(io);
    });

    socket.on("error", (err) => {
      console.error(`[socket error] user:${userId}`, err.message);
    });
  });

  return io;
};

/**
 * Emit to a specific user's personal room (used by notification utility).
 * The user room is `user:<userId>`.
 */
export const emitToUser = (io, userId, event, data) => {
  io?.to(`user:${userId}`).emit(event, data);
};

/**
 * Emit to a conversation room.
 * Replaces the old loop-over-participants pattern.
 */
export const emitToConv = (io, convId, event, data) => {
  io?.to(`conv:${convId}`).emit(event, data);
};
