import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    author:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content:     { type: String, required: true },
    media:       [{ 
      url: String, 
      publicId: String,
      type: { type: String, enum: ["image", "video"] } 
    }],
    likes:       [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    shares:      { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Post", postSchema);
