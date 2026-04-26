import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    isGroupChat:  { type: Boolean, default: false },
    name:         { type: String, trim: true },
    avatar:       { type: String, default: "" },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    admins:       [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    lastMessage:  { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────────
conversationSchema.index({ participants: 1, updatedAt: -1 }); // conversation list
conversationSchema.index({ participants: 1, isGroupChat: 1 }); // DM lookup

export default mongoose.model("Conversation", conversationSchema);
