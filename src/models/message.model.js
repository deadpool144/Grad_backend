import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true },
    sender:       { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text:         { type: String, trim: true, default: "" },
    media:        { url: String, publicId: String, type: { type: String, enum: ["image", "file"] } },
    readBy:       [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);
