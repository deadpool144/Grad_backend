import Conversation from "../../models/Conversation.js";
import Message from "../../models/Message.js";
import User from "../../models/User.js";
import { ApiError } from "../../utils/ApiError.js";
import { uploadBuffer } from "../../config/cloudinary.js";
import { parsePage } from "../../utils/paginate.js";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const assertParticipant = (conv, userId) => {
  const isParticipant = conv.participants.some(
    (p) => (p._id || p).toString() === userId.toString()
  );
  if (!isParticipant) throw new ApiError(403, "You are not a participant of this conversation.");
};

// ─────────────────────────────────────────────────────────────────────────────
// GET OR CREATE DM
// ─────────────────────────────────────────────────────────────────────────────
export const accessDM = async (userId, targetId) => {
  if (userId.toString() === targetId.toString())
    throw new ApiError(400, "Cannot message yourself.");

  // Block check
  const [me, target] = await Promise.all([
    User.findById(userId).select("blockedUsers").lean(),
    User.findById(targetId).select("blockedUsers").lean(),
  ]);
  if (!target) throw new ApiError(404, "User not found.");

  const blocked =
    me?.blockedUsers?.some((id) => id.toString() === targetId.toString()) ||
    target?.blockedUsers?.some((id) => id.toString() === userId.toString());
  if (blocked) throw new ApiError(403, "Cannot message a blocked user.");

  let conv = await Conversation.findOne({
    isGroupChat: false,
    participants: { $all: [userId, targetId], $size: 2 }
  }).populate("participants", "firstName lastName avatar headline")
    .populate({
      path: "lastMessage",
      populate: { path: "sender", select: "firstName lastName" },
    });

  if (!conv) {
    const newConv = await Conversation.create({
      isGroupChat: false,
      participants: [userId, targetId],
    });
    conv = await Conversation.findById(newConv._id)
      .populate("participants", "firstName lastName avatar headline")
      .populate({
        path: "lastMessage",
        populate: { path: "sender", select: "firstName lastName" },
      });
  }

  return conv;
};

// ─────────────────────────────────────────────────────────────────────────────
// GROUP CHAT
// ─────────────────────────────────────────────────────────────────────────────
export const createGroup = async (userId, { name, participantIds = [] }) => {
  if (!name?.trim()) throw new ApiError(400, "Group name is required.");
  if (participantIds.length < 1) throw new ApiError(400, "Add at least one other member.");

  const members = [...new Set([userId.toString(), ...participantIds.map(String)])];

  const conv = await Conversation.create({
    isGroupChat:  true,
    name:         name.trim(),
    participants: members,
    admins:       [userId],
  });
  return conv.populate("participants", "firstName lastName avatar");
};

// ─────────────────────────────────────────────────────────────────────────────
// LIST CONVERSATIONS
// ─────────────────────────────────────────────────────────────────────────────
export const getConversations = async (userId) => {
  return Conversation.find({ participants: userId })
    .populate("participants", "firstName lastName avatar")
    .populate({
      path:     "lastMessage",
      populate: { path: "sender", select: "firstName lastName" },
    })
    .sort({ updatedAt: -1 })
    .lean();
};

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGES (PAGINATED — cursor approach: newest first, reversed in client)
// ─────────────────────────────────────────────────────────────────────────────
export const getMessages = async (convId, userId, queryParams = {}) => {
  const conv = await Conversation.findById(convId).select("participants");
  if (!conv) throw new ApiError(404, "Conversation not found.");
  assertParticipant(conv, userId);

  const { page, limit, skip } = parsePage(queryParams, 50);

  const messages = await Message.find({ conversation: convId, deletedBy: { $ne: userId } })
    .populate("sender", "firstName lastName avatar")
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return messages;
};

// ─────────────────────────────────────────────────────────────────────────────
// SEND MESSAGE
// ─────────────────────────────────────────────────────────────────────────────
export const sendMessage = async (convId, senderId, { text }, file, io) => {
  const conv = await Conversation.findById(convId).select("participants");
  if (!conv) throw new ApiError(404, "Conversation not found.");
  assertParticipant(conv, senderId);

  if (!text?.trim() && !file) throw new ApiError(400, "Message cannot be empty.");

  let media;
  if (file) {
    const isImage = file.mimetype.startsWith("image/");
    const result  = await uploadBuffer(file.buffer, "messages", isImage ? "image" : "auto");
    media = { url: result.secure_url, publicId: result.public_id, type: isImage ? "image" : "file" };
  }

  const msg = await Message.create({
    conversation: convId,
    sender:       senderId,
    text:         text?.trim() || "",
    media,
    readBy:       [senderId], // sender has already "read" their own message
  });

  await msg.populate("sender", "firstName lastName avatar");

  // Update conversation's lastMessage + updatedAt atomically
  await Conversation.findByIdAndUpdate(convId, { lastMessage: msg._id });

  // Emit to ALL participants in the room (efficient — single emit to room)
  if (io) {
    io.to(`conv:${convId}`).emit("new_message", msg);
  }

  return msg;
};

// ─────────────────────────────────────────────────────────────────────────────
// MARK READ
// ─────────────────────────────────────────────────────────────────────────────
export const markRead = async (convId, userId) => {
  await Message.updateMany(
    { conversation: convId, readBy: { $ne: userId }, deletedBy: { $ne: userId } },
    { $addToSet: { readBy: userId } }
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE MESSAGE (soft delete per-user)
// ─────────────────────────────────────────────────────────────────────────────
export const deleteMessage = async (msgId, userId) => {
  const msg = await Message.findById(msgId);
  if (!msg) throw new ApiError(404, "Message not found.");
  if (msg.sender.toString() !== userId.toString())
    throw new ApiError(403, "You can only delete your own messages.");

  await Message.findByIdAndUpdate(msgId, { $addToSet: { deletedBy: userId } });
  return { deleted: true };
};

// ─────────────────────────────────────────────────────────────────────────────
// CLEAR / DELETE CONVERSATION
// ─────────────────────────────────────────────────────────────────────────────
export const clearMessages = async (convId, userId) => {
  const conv = await Conversation.findById(convId).select("participants");
  if (!conv) throw new ApiError(404, "Conversation not found.");
  assertParticipant(conv, userId);

  await Message.deleteMany({ conversation: convId });
  await Conversation.findByIdAndUpdate(convId, { lastMessage: null });
};

export const deleteConversation = async (convId, userId) => {
  const conv = await Conversation.findById(convId).select("participants admins isGroupChat");
  if (!conv) throw new ApiError(404, "Conversation not found.");
  assertParticipant(conv, userId);

  if (conv.isGroupChat) {
    const isAdmin = conv.admins.some((id) => id.toString() === userId.toString());
    if (!isAdmin) throw new ApiError(403, "Only group admins can delete the group.");
  }

  await Promise.all([
    Message.deleteMany({ conversation: convId }),
    Conversation.findByIdAndDelete(convId),
  ]);
};
