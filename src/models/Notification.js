import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sender:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    type:     {
      type: String,
      enum: ["like", "comment", "connection_request", "connection_accepted", "event", "mention"],
      required: true,
    },
    post:    { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
    event:   { type: mongoose.Schema.Types.ObjectId, ref: "Event" },
    read:    { type: Boolean, default: false },
    text:    { type: String, default: "" },
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────────
notificationSchema.index({ receiver: 1, read: 1, createdAt: -1 }); // unread count + list
notificationSchema.index({ receiver: 1, createdAt: -1 });

// Auto-delete notifications older than 60 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 24 * 60 * 60 });

export default mongoose.model("Notification", notificationSchema);
