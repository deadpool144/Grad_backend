import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true },
    sender:       { type: mongoose.Schema.Types.ObjectId, ref: "User",         required: true },
    text:         { type: String, trim: true, default: "" },
    media:        {
      url:      String,
      publicId: String,
      type:     { type: String, enum: ["image", "file"] },
    },
    readBy:       [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    deletedBy:    [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // soft-delete per user
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────────
messageSchema.index({ conversation: 1, createdAt: 1 });  // history paging
messageSchema.index({ sender: 1 });

export default mongoose.model("Message", messageSchema);
