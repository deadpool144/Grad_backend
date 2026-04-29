import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName:  { type: String, required: true, trim: true },
    email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:  { type: String, required: true },
    role:      { type: String, enum: ["user", "admin", "sub-admin"], default: "user" },

    // ── Email verification ──────────────────────────────────────────────────
    isVerified:  { type: Boolean, default: false },
    isBlocked:   { type: Boolean, default: false },
    otp:         { type: String, select: false },   // hidden by default
    otpExpires:  { type: Date,   select: false },

    // ── Profile ─────────────────────────────────────────────────────────────
    avatar:         { type: String, default: "" },
    avatarPublicId: { type: String, default: "" },
    coverImage:     { type: String, default: "" },
    coverPublicId:  { type: String, default: "" },
    headline:       { type: String, default: "", maxlength: 220 },
    bio:            { type: String, default: "", maxlength: 2000 },
    location:       { type: String, default: "" },
    batch:          { type: String, default: "" },
    department:     { type: String, default: "" },
    website:        { type: String, default: "" },
    linkedIn:       { type: String, default: "" },
    skills:         [{ type: String }],

    // ── Connections ──────────────────────────────────────────────────────────
    connections:           [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    connectionRequests:    [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // incoming
    sentConnectionRequests:[{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // outgoing (NEW)
    blockedUsers:          [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    education: [
      {
        school: { type: String, required: true },
        degree: String,
        fieldOfStudy: String,
        from: String,
        to: String,
        current: { type: Boolean, default: false },
        description: String,
      }
    ],
    experience: [
      {
        title: { type: String, required: true },
        company: { type: String, required: true },
        location: String,
        from: String,
        to: String,
        current: { type: Boolean, default: false },
        description: String,
      }
    ],
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────────
// Full-text search on name
userSchema.index({ firstName: "text", lastName: "text", headline: "text" });
// Directory filters
userSchema.index({ isVerified: 1, role: 1, batch: 1, department: 1 });
// Online presence lookup
userSchema.index({ _id: 1, isVerified: 1 });

// ── TTL: auto-delete unverified users whose OTP has expired (48h grace) ───
// Mongo will delete docs where otpExpires <= now AND isVerified == false
// We set otpExpires far enough (see auth service) to give the user 24h.
// Note: MongoDB TTL indexes only support Date fields; we do this in the
// auth service via a scheduled findOneAndDelete approach for precision.

export default mongoose.model("User", userSchema);
