import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    isGroupChat:  { type: Boolean, default: false },
    name:         { type: String, trim: true },          // group name
    avatar:       { type: String, default: "" },         // group avatar
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    admins:       [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // group admins
    lastMessage:  { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
  },
  { timestamps: true }
);

export default mongoose.model("Conversation", conversationSchema);
