import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true },
    description: { type: String, required: true },
    coverImage:  { type: String, default: "" },
    coverPublicId: { type: String, default: "" },
    date:        { type: Date, required: true },
    location:    { type: String, default: "" },    // physical
    virtualLink: { type: String, default: "" },    // online
    organizer:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    attendees:   [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    capacity:    { type: Number, default: 0 },     // 0 = unlimited
  },
  { timestamps: true }
);

export default mongoose.model("Event", eventSchema);
