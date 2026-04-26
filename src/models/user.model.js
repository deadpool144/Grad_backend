import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName:  { type: String, required: true, trim: true },
    email:     { type: String, required: true, unique: true, lowercase: true },
    password:  { type: String, required: true },
    role:      { type: String, enum: ["user", "admin", "sub-admin"], default: "user" },

    // Email verification
    isVerified:  { type: Boolean, default: false },
    otp:         { type: String },
    otpExpires:  { type: Date },

    // Profile
    avatar:          { type: String, default: "" },
    avatarPublicId:  { type: String, default: "" },
    coverImage:      { type: String, default: "" },
    coverPublicId:   { type: String, default: "" },
    headline:    { type: String, default: "" },  // e.g. "Software Engineer at Google"
    bio:         { type: String, default: "" },
    location:    { type: String, default: "" },
    batch:       { type: String, default: "" },
    department:  { type: String, default: "" },
    website:     { type: String, default: "" },

    // Connections & Privacy
    connections:        [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    connectionRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // incoming
    blockedUsers:       [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
