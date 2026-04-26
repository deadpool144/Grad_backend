import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    author:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true, trim: true, maxlength: 5000 },
    media:   [{
      url:      { type: String, required: true },
      publicId: { type: String, required: true },
      type:     { type: String, enum: ["image", "video"], required: true },
    }],

    // ── Engagement ─────────────────────────────────────────────────────────
    likes:        [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    commentCount: { type: Number, default: 0 },   // maintained atomically
    shares:       { type: Number, default: 0 },
    savedBy:      [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // bookmarks
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────────
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });              // feed sort
postSchema.index({ savedBy: 1 });                 // bookmarks lookup

export default mongoose.model("Post", postSchema);
