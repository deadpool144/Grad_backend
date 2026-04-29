import User from "../../models/User.js";
import { ApiError } from "../../utils/ApiError.js";
import { uploadBuffer, deleteFile } from "../../config/cloudinary.js";
import { createAndEmit } from "../../utils/notify.js";
import { parsePage, paginateResult } from "../../utils/paginate.js";

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────────────────────────────────────────
export const getProfile = async (userId, viewerId) => {
  const user = await User.findById(userId)
    .select("-password -otp -otpExpires -blockedUsers -sentConnectionRequests")
    .populate("connections", "firstName lastName avatar headline");

  if (!user) throw new ApiError(404, "User not found.");

  // Hide profile from users who blocked viewer or whom viewer blocked
  const isBlocked =
    user.blockedUsers?.some((id) => id.toString() === viewerId?.toString()) ||
    (viewerId && await User.exists({ _id: viewerId, blockedUsers: userId }));
  if (isBlocked) throw new ApiError(403, "Profile unavailable.");

  return user;
};

export const updateProfile = async (userId, fields) => {
  const ALLOWED = [
    "firstName", "lastName", "headline", "bio", "location",
    "batch", "department", "website", "linkedIn", "skills",
    "education", "experience",
  ];
  const update = {};
  ALLOWED.forEach((key) => { if (fields[key] !== undefined) update[key] = fields[key]; });

  return User.findByIdAndUpdate(userId, update, { new: true })
    .select("-password -otp -otpExpires");
};

export const uploadAvatar = async (userId, file) => {
  if (!file) throw new ApiError(400, "No file uploaded.");
  const user = await User.findById(userId).select("avatarPublicId");
  if (user?.avatarPublicId) await deleteFile(user.avatarPublicId);

  const result = await uploadBuffer(file.buffer, "avatars", "image");
  return User.findByIdAndUpdate(
    userId,
    { avatar: result.secure_url, avatarPublicId: result.public_id },
    { new: true }
  ).select("-password -otp -otpExpires");
};

export const uploadCover = async (userId, file) => {
  if (!file) throw new ApiError(400, "No file uploaded.");
  const user = await User.findById(userId).select("coverPublicId");
  if (user?.coverPublicId) await deleteFile(user.coverPublicId);

  const result = await uploadBuffer(file.buffer, "covers", "image");
  return User.findByIdAndUpdate(
    userId,
    { coverImage: result.secure_url, coverPublicId: result.public_id },
    { new: true }
  ).select("-password -otp -otpExpires");
};

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH & DIRECTORY
// ─────────────────────────────────────────────────────────────────────────────
export const searchUsers = async (query, currentUserId) => {
  if (!query?.trim()) return [];

  // Get current user's block list in one query
  const me = await User.findById(currentUserId).select("blockedUsers").lean();
  const blocked = me?.blockedUsers?.map(String) || [];

  return User.find({
    _id:        { $ne: currentUserId, $nin: blocked },
    isVerified: true,
    blockedUsers: { $ne: currentUserId },
    $text:      { $search: query },
  })
    .select("firstName lastName avatar headline batch department")
    .limit(15)
    .lean();
};

export const getDirectory = async (queryParams, currentUserId) => {
  const { page, limit, skip } = parsePage(queryParams);
  const { batch, department, q } = queryParams;

  const me = await User.findById(currentUserId).select("blockedUsers").lean();
  const blocked = me?.blockedUsers?.map(String) || [];

  const filter = {
    _id:        { $ne: currentUserId, $nin: blocked },
    isVerified: true,
    role:       { $ne: "admin" },
    blockedUsers: { $ne: currentUserId },
  };
  if (batch)      filter.batch      = batch;
  if (department) filter.department = department;
  if (q?.trim())  filter.$text      = { $search: q };

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("firstName lastName avatar headline batch department connections connectionRequests sentConnectionRequests")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return paginateResult(users, total, page, limit);
};

// ─────────────────────────────────────────────────────────────────────────────
// CONNECTION STATUS — critical for frontend Connect button state
// ─────────────────────────────────────────────────────────────────────────────
export const getConnectionStatus = async (viewerId, targetId) => {
  if (viewerId.toString() === targetId.toString()) return { status: "self" };

  const [viewer, target] = await Promise.all([
    User.findById(viewerId).select("connections connectionRequests sentConnectionRequests").lean(),
    User.findById(targetId).select("connections connectionRequests sentConnectionRequests").lean(),
  ]);
  if (!target) throw new ApiError(404, "User not found.");

  const viewerIdStr = viewerId.toString();
  const targetIdStr = targetId.toString();

  const connected  = viewer.connections.some((id) => id.toString() === targetIdStr);
  const sentByMe   = viewer.sentConnectionRequests?.some((id) => id.toString() === targetIdStr);
  const sentToMe   = viewer.connectionRequests?.some((id) => id.toString() === targetIdStr);

  if (connected)  return { status: "connected" };
  if (sentByMe)   return { status: "pending_sent" };
  if (sentToMe)   return { status: "pending_received" };
  return { status: "none" };
};

// ─────────────────────────────────────────────────────────────────────────────
// CONNECTIONS
// ─────────────────────────────────────────────────────────────────────────────
export const sendConnectionRequest = async (fromId, toId, io) => {
  if (fromId.toString() === toId.toString())
    throw new ApiError(400, "You cannot connect with yourself.");

  const [from, to] = await Promise.all([
    User.findById(fromId).select("connections sentConnectionRequests blockedUsers"),
    User.findById(toId).select("connections connectionRequests blockedUsers"),
  ]);
  if (!to) throw new ApiError(404, "User not found.");

  // Block checks
  if (from.blockedUsers.includes(toId) || to.blockedUsers.includes(fromId))
    throw new ApiError(403, "Cannot send connection request.");

  if (from.connections.includes(toId))
    throw new ApiError(400, "Already connected.");
  if (from.sentConnectionRequests?.includes(toId))
    throw new ApiError(400, "Connection request already sent.");
  if (to.connectionRequests?.includes(fromId))
    throw new ApiError(400, "Connection request already sent.");

  // Atomic updates
  await Promise.all([
    User.findByIdAndUpdate(toId,   { $addToSet: { connectionRequests:     fromId } }),
    User.findByIdAndUpdate(fromId, { $addToSet: { sentConnectionRequests: toId   } }),
  ]);

  await createAndEmit(io, {
    receiver: toId,
    sender:   fromId,
    type:     "connection_request",
    text:     "sent you a connection request",
  });
};

export const respondToConnection = async (userId, fromId, action, io) => {
  if (!["accept", "reject"].includes(action))
    throw new ApiError(400, "Action must be 'accept' or 'reject'.");

  // Clean up the request from both sides
  await Promise.all([
    User.findByIdAndUpdate(userId, { $pull: { connectionRequests:     fromId } }),
    User.findByIdAndUpdate(fromId, { $pull: { sentConnectionRequests: userId } }),
  ]);

  // Remove the connection request notification from the database
  const { default: Notification } = await import("../../models/Notification.js");
  await Notification.findOneAndDelete({
    receiver: userId,
    sender: fromId,
    type: "connection_request"
  });

  if (action === "accept") {
    await Promise.all([
      User.findByIdAndUpdate(userId, { $addToSet: { connections: fromId } }),
      User.findByIdAndUpdate(fromId, { $addToSet: { connections: userId } }),
    ]);

    await createAndEmit(io, {
      receiver: fromId,
      sender:   userId,
      type:     "connection_accepted",
      text:     "accepted your connection request",
    });
  }
};

export const removeConnection = async (userId, targetId) => {
  await Promise.all([
    User.findByIdAndUpdate(userId,   { $pull: { connections: targetId, sentConnectionRequests: targetId } }),
    User.findByIdAndUpdate(targetId, { $pull: { connections: userId,   sentConnectionRequests: userId   } }),
  ]);

  const { default: Notification } = await import("../../models/Notification.js");
  await Notification.deleteMany({
    $or: [
      { receiver: userId, sender: targetId, type: "connection_request" },
      { receiver: targetId, sender: userId, type: "connection_request" }
    ]
  });
};

export const getConnections = async (userId) => {
  const user = await User.findById(userId)
    .select("connections")
    .populate("connections", "firstName lastName avatar headline batch department");
  if (!user) throw new ApiError(404, "User not found.");
  return user.connections;
};

export const getPendingRequests = async (userId) => {
  const user = await User.findById(userId)
    .select("connectionRequests")
    .populate("connectionRequests", "firstName lastName avatar headline batch department");
  if (!user) throw new ApiError(404, "User not found.");
  return user.connectionRequests;
};

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK
// ─────────────────────────────────────────────────────────────────────────────
export const toggleBlockUser = async (userId, targetId) => {
  if (userId.toString() === targetId.toString())
    throw new ApiError(400, "Cannot block yourself.");

  const user = await User.findById(userId).select("blockedUsers connections sentConnectionRequests");
  if (!user) throw new ApiError(404, "User not found.");
  if (!(await User.exists({ _id: targetId }))) throw new ApiError(404, "Target user not found.");

  const isBlocked = user.blockedUsers.includes(targetId);

  if (isBlocked) {
    await User.findByIdAndUpdate(userId, { $pull: { blockedUsers: targetId } });
    return { blocked: false };
  } else {
    // Block: also remove any existing connection/request
    await Promise.all([
      User.findByIdAndUpdate(userId,   {
        $addToSet: { blockedUsers: targetId },
        $pull:     { connections: targetId, sentConnectionRequests: targetId, connectionRequests: targetId },
      }),
      User.findByIdAndUpdate(targetId, {
        $pull: { connections: userId, sentConnectionRequests: userId, connectionRequests: userId },
      }),
    ]);
    return { blocked: true };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// SUGGESTIONS
// ─────────────────────────────────────────────────────────────────────────────
export const getSuggestedUsers = async (userId, limit = 10) => {
  const me = await User.findById(userId)
    .select("batch department connections blockedUsers sentConnectionRequests")
    .lean();
  if (!me) throw new ApiError(404, "User not found.");

  const excluded = [
    userId,
    ...me.connections.map(String),
    ...me.blockedUsers.map(String),
    ...(me.sentConnectionRequests?.map(String) || []),
  ];

  const filter = {
    _id:          { $nin: excluded },
    isVerified:   true,
    role:         { $ne: "admin" },
    blockedUsers: { $ne: userId },
  };

  const orClause = [];
  if (me.batch)      orClause.push({ batch:      me.batch });
  if (me.department) orClause.push({ department: me.department });
  if (orClause.length > 0) filter.$or = orClause;

  return User.find(filter)
    .select("firstName lastName avatar headline batch department")
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .lean();
};
