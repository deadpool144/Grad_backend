import Notification from "../models/Notification.js";

/**
 * Create a notification and emit it via socket in one call.
 * Absorbs errors silently so a notification failure never breaks the main action.
 *
 * @param {import("socket.io").Server} io
 * @param {{ receiver, sender, type, text, post?, event? }} payload
 */
export const createAndEmit = async (io, payload) => {
  try {
    // Don't notify yourself
    if (payload.receiver?.toString() === payload.sender?.toString()) return;

    const notif = await Notification.create(payload);
    await notif.populate("sender", "firstName lastName avatar");

    if (io) {
      io.to(`user:${payload.receiver}`).emit("new_notification", notif);
    }
  } catch (err) {
    // Notification failures must never crash the main request
    console.error("[notify] Failed to create notification:", err.message);
  }
};
