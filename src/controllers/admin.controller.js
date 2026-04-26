import User from "../models/user.model.js";
import * as postService from "../services/post.service.js";
import * as eventService from "../services/event.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const getStats = asyncHandler(async (req, res) => {
  const [users, posts, events] = await Promise.all([
    User.countDocuments({ isVerified: true }),
    User.countDocuments({ role: "admin" }), // just to check
    postService.getFeed(req.user._id, 1, 1), // dummy just to use service
  ]);
  // Use simple counts
  const u = await User.countDocuments({ isVerified: true });
  const p = await postService.Post?.countDocuments() || 0; // fallback if needed
  res.json(new ApiResponse(200, { users: u, posts: p, events: await eventService.getEvents({limit: 1}).then(r => r.total) }));
});

export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find()
    .select("-password -otp -otpExpires")
    .sort({ createdAt: -1 });
  res.json(new ApiResponse(200, users));
});

export const deleteAnyPost = asyncHandler(async (req, res) => {
  await postService.deletePost(req.params.id, req.user._id, true);
  res.json(new ApiResponse(200, null, "Post deleted by admin"));
});

export const deleteAnyEvent = asyncHandler(async (req, res) => {
  await eventService.deleteEvent(req.params.id, req.user._id, true);
  res.json(new ApiResponse(200, null, "Event deleted by admin"));
});

export const updateUserRole = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role: req.body.role },
    { returnDocument: 'after' }
  ).select("-password -otp -otpExpires");
  res.json(new ApiResponse(200, user, "Role updated"));
});
