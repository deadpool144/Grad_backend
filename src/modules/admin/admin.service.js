import User from "../../models/User.js";
import Post from "../../models/Post.js";
import Event from "../../models/Event.js";
import Notification from "../../models/Notification.js";
import { ApiError } from "../../utils/ApiError.js";
import * as postService from "../posts/post.service.js";
import * as eventService from "../events/event.service.js";
import { parsePage, paginateResult } from "../../utils/paginate.js";

export const getStats = async () => {
  const [totalUsers, verifiedUsers, admins, totalPosts, totalEvents, pendingVerification] =
    await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isVerified: true }),
      User.countDocuments({ role: "admin" }),
      Post.countDocuments(),
      Event.countDocuments(),
      User.countDocuments({ isVerified: false }),
    ]);

  return { totalUsers, verifiedUsers, admins, totalPosts, totalEvents, pendingVerification };
};

export const getAllUsers = async (queryParams = {}) => {
  const { page, limit, skip } = parsePage(queryParams);
  const { role, q, isVerified } = queryParams;

  const filter = {};
  if (role)                    filter.role = role;
  if (isVerified !== undefined) filter.isVerified = isVerified === "true";
  if (q?.trim())               filter.$text = { $search: q };

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("-password -otp -otpExpires")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return paginateResult(users, total, page, limit);
};

export const updateUserRole = async (targetId, role, adminId) => {
  const ALLOWED_ROLES = ["user", "admin", "sub-admin"];
  if (!ALLOWED_ROLES.includes(role)) throw new ApiError(400, "Invalid role.");
  if (targetId.toString() === adminId.toString())
    throw new ApiError(400, "Cannot change your own role.");

  return User.findByIdAndUpdate(targetId, { role }, { new: true })
    .select("-password -otp -otpExpires");
};

export const deleteAnyUser = async (targetId, adminId) => {
  if (targetId.toString() === adminId.toString())
    throw new ApiError(400, "Cannot delete your own account.");
  await User.findByIdAndDelete(targetId);
};

export const deleteAnyPost  = (postId,  adminId) => postService.deletePost(postId, adminId, true);
export const deleteAnyEvent = (eventId, adminId) => eventService.deleteEvent(eventId, adminId, true);
