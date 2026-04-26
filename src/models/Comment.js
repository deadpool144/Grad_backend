import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    post:          { type: mongoose.Schema.Types.ObjectId, ref: "Post",    required: true },
    author:        { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true },
    parentComment: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", default: null }, // threaded
    text:          { type: String, required: true, trim: true, maxlength: 2000 },
    likes:         [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────────
commentSchema.index({ post: 1, createdAt: 1 });
commentSchema.index({ author: 1 });

export default mongoose.model("Comment", commentSchema);
