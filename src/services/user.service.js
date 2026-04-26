import User from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadBuffer, deleteFile } from "../config/cloudinary.js";
import Notification from "../models/notification.model.js";

// Get a user's public profile
export const getProfile = async (userId) => {
  const user = await User.findById(userId)
    .select("-password -otp -otpExpires")
    .populate("connections", "firstName lastName avatar headline");
  if (!user) throw new ApiError(404, "User not found");
  return user;
};

// Update profile fields
export const updateProfile = async (userId, fields) => {
  const allowed = ["firstName", "lastName", "headline", "bio", "location", "batch", "department", "website"];
  const update = {};
  allowed.forEach((key) => { if (fields[key] !== undefined) update[key] = fields[key]; });

  const user = await User.findByIdAndUpdate(userId, update, { returnDocument: 'after' }).select("-password -otp -otpExpires");
  return user;
};
// Upload avatar to Cloudinary
export const uploadAvatar = async (userId, file) => {
  const user = await User.findById(userId);
  if (user?.avatarPublicId) await deleteFile(user.avatarPublicId);

  const result = await uploadBuffer(file.buffer, "avatars", "image");
  return User.findByIdAndUpdate(
    userId,
    { avatar: result.secure_url, avatarPublicId: result.public_id },
    { returnDocument: 'after' }
  ).select("-password -otp -otpExpires");
};

// Upload cover image to Cloudinary
export const uploadCover = async (userId, file) => {
  const user = await User.findById(userId);
  if (user?.coverPublicId) await deleteFile(user.coverPublicId);

  const result = await uploadBuffer(file.buffer, "covers", "image");
  return User.findByIdAndUpdate(
    userId,
    { coverImage: result.secure_url, coverPublicId: result.public_id },
    { returnDocument: 'after' }
  ).select("-password -otp -otpExpires");
};

// Search users
export const searchUsers = async (query, currentUserId) => {
  const me = await User.findById(currentUserId).select("blockedUsers");
  const regex = new RegExp(query, "i");
  
  return User.find({
    _id: { $ne: currentUserId, $nin: me?.blockedUsers || [] },
    isVerified: true,
    $or: [{ firstName: regex }, { lastName: regex }, { email: regex }, { headline: regex }],
    blockedUsers: { $ne: currentUserId } // Don't show users who blocked me
  })
    .select("firstName lastName avatar headline batch department")
    .limit(20);
};

// Alumni directory (paginated)
export const getDirectory = async ({ page = 1, limit = 20, batch, department }, currentUserId) => {
  const me = await User.findById(currentUserId).select("blockedUsers");
  const filter = { 
    isVerified: true, 
    role: { $ne: "admin" },
    _id: { $nin: me?.blockedUsers || [] },
    blockedUsers: { $ne: currentUserId }
  };
  if (batch) filter.batch = batch;
  if (department) filter.department = department;

  const users = await User.find(filter)
    .select("firstName lastName avatar headline batch department connections")
    .skip((page - 1) * limit)
    .limit(limit)
    .sort({ createdAt: -1 });

  const total = await User.countDocuments(filter);
  return { users, total, page: Number(page), pages: Math.ceil(total / limit) };
};

// Block/Unblock
export const toggleBlockUser = async (userId, targetId) => {
  if (userId.toString() === targetId.toString()) throw new ApiError(400, "Cannot block yourself");
  const user = await User.findById(userId);
  const target = await User.findById(targetId);
  if (!target) throw new ApiError(404, "Target user not found");

  const isBlocked = user.blockedUsers.includes(targetId);
  if (isBlocked) {
    user.blockedUsers.pull(targetId);
  } else {
    user.blockedUsers.push(targetId);
    // Remove connection if exists
    user.connections.pull(targetId);
    target.connections.pull(userId);
    await target.save();
  }
  await user.save();
  return { blocked: !isBlocked };
};

// Send connection request
export const sendConnectionRequest = async (fromId, toId) => {
  if (fromId === toId) throw new ApiError(400, "Cannot connect with yourself");

  const toUser = await User.findById(toId);
  if (!toUser) throw new ApiError(404, "User not found");

  if (toUser.connections.includes(fromId)) throw new ApiError(400, "Already connected");
  if (toUser.connectionRequests.includes(fromId)) throw new ApiError(400, "Request already sent");

  toUser.connectionRequests.push(fromId);
  await toUser.save();

  await Notification.create({
    receiver: toId,
    sender: fromId,
    type: "connection_request",
    text: "sent you a connection request",
  });
};

// Accept or reject connection request
export const respondToConnection = async (userId, fromId, action) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");

  user.connectionRequests = user.connectionRequests.filter((id) => id.toString() !== fromId);

  if (action === "accept") {
    user.connections.push(fromId);
    await User.findByIdAndUpdate(fromId, { $push: { connections: userId } });

    await Notification.create({
      receiver: fromId,
      sender: userId,
      type: "connection_accepted",
      text: "accepted your connection request",
    });
  }

  await user.save();
};

// Remove connection
export const removeConnection = async (userId, targetId) => {
  const user = await User.findById(userId);
  const target = await User.findById(targetId);
  if (!user || !target) throw new ApiError(404, "User not found");

  user.connections.pull(targetId);
  target.connections.pull(userId);

  await Promise.all([user.save(), target.save()]);
};

// Get suggested users (Same batch or department, not connected)
export const getSuggestedUsers = async (userId, limit = 10) => {
  const me = await User.findById(userId).select("batch department connections blockedUsers");
  if (!me) throw new ApiError(404, "User not found");

  const filter = {
    _id: { $ne: userId, $nin: [...me.connections, ...me.blockedUsers] },
    isVerified: true,
    role: { $ne: "admin" },
    $or: [],
    blockedUsers: { $ne: userId }
  };

  if (me.batch) filter.$or.push({ batch: me.batch });
  if (me.department) filter.$or.push({ department: me.department });
  
  // If no batch/dept info, just show most recent users
  if (filter.$or.length === 0) delete filter.$or;

  return User.find(filter)
    .select("firstName lastName avatar headline batch department")
    .sort({ createdAt: -1 })
    .limit(limit);
};
