import mongoose from "mongoose";

const CATEGORIES = ["tech", "networking", "career", "alumni", "social", "other"];

const eventSchema = new mongoose.Schema(
  {
    title:        { type: String, required: true, trim: true, maxlength: 200 },
    description:  { type: String, required: true, trim: true, maxlength: 5000 },
    coverImage:   { type: String, default: "" },
    coverPublicId:{ type: String, default: "" },
    date:         { type: Date,   required: true },
    endDate:      { type: Date },
    location:     { type: String, default: "" },
    virtualLink:  { type: String, default: "" },
    isOnline:     { type: Boolean, default: false },
    category:     { type: String, enum: CATEGORIES, default: "other" },
    organizer:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    attendees:    [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    capacity:     { type: Number, default: 0 }, // 0 = unlimited
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────────
eventSchema.index({ date: 1 });
eventSchema.index({ organizer: 1 });
eventSchema.index({ category: 1, date: 1 });

export default mongoose.model("Event", eventSchema);
