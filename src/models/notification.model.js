import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sender:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    type:     {
      type: String,
      enum: ["like", "comment", "connection_request", "connection_accepted", "message"],
      required: true,
    },
    post:     { type: mongoose.Schema.Types.ObjectId, ref: "Post" }, // optional
    read:     { type: Boolean, default: false },
    text:     { type: String, default: "" }, // human-readable message
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);
