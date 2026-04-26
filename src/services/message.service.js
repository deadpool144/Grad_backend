import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadBuffer } from "../config/cloudinary.js";
import User from "../models/user.model.js";

// Get or create a DM conversation between two users
export const accessDM = async (userId, targetId) => {
  // Check blocking
  const [me, target] = await Promise.all([
    User.findById(userId).select("blockedUsers"),
    User.findById(targetId).select("blockedUsers"),
  ]);

  const isBlocked = me?.blockedUsers?.includes(targetId) || target?.blockedUsers?.includes(userId);
  if (isBlocked) throw new ApiError(403, "Cannot message a blocked user");

  let conv = await Conversation.findOne({
    isGroupChat: false,
    participants: { $all: [userId, targetId], $size: 2 },
  })
    .populate("participants", "firstName lastName avatar")
    .populate("lastMessage");

  if (!conv) {
    conv = await Conversation.create({
      isGroupChat: false,
      participants: [userId, targetId],
    });
    conv = await conv.populate("participants", "firstName lastName avatar");
  }
  return conv;
};

// Create group
export const createGroup = async (userId, { name, participantIds }) => {
  if (!name) throw new ApiError(400, "Group name is required");
  if (!participantIds || participantIds.length < 1) throw new ApiError(400, "Add at least one member");

  const members = [...new Set([userId.toString(), ...participantIds])];
  const conv = await Conversation.create({
    isGroupChat: true,
    name,
    participants: members,
    admins: [userId],
  });
  return conv.populate("participants", "firstName lastName avatar");
};

// All conversations for a user
export const getConversations = async (userId) => {
  return Conversation.find({ participants: userId })
    .populate("participants", "firstName lastName avatar")
    .populate({
      path: "lastMessage",
      populate: { path: "sender", select: "firstName lastName avatar" },
    })
    .sort({ updatedAt: -1 });
};

// Messages in a conversation (paginated)
export const getMessages = async (convId, userId, page = 1, limit = 50) => {
  const conv = await Conversation.findById(convId);
  if (!conv) throw new ApiError(404, "Conversation not found");
  if (!conv.participants.includes(userId)) throw new ApiError(403, "Not a participant");

  return Message.find({ conversation: convId })
    .populate("sender", "firstName lastName avatar")
    .sort({ createdAt: 1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

// Send a message
export const sendMessage = async (convId, senderId, { text }, file) => {
  const conv = await Conversation.findById(convId);
  if (!conv) throw new ApiError(404, "Conversation not found");
  if (!conv.participants.map(String).includes(senderId.toString())) {
    throw new ApiError(403, "Not a participant");
  }

  let media;
  if (file) {
    const isImage = file.mimetype.startsWith("image/");
    const resType = isImage ? "image" : "auto";
    const result = await uploadBuffer(file.buffer, "messages", resType);
    media = { 
      url: result.secure_url, 
      publicId: result.public_id,
      type: isImage ? "image" : "file" 
    };
  }

  const msg = await Message.create({ conversation: convId, sender: senderId, text: text || "", media });
  await msg.populate("sender", "firstName lastName avatar");

  // Update lastMessage on conversation
  conv.lastMessage = msg._id;
  await conv.save();

  return msg;
};

// Mark all messages in a conversation as read by userId
export const markRead = async (convId, userId) => {
  await Message.updateMany(
    { conversation: convId, readBy: { $ne: userId } },
    { $push: { readBy: userId } }
  );
};

// Clear all messages in a conversation
export const clearMessages = async (convId, userId) => {
  const conv = await Conversation.findById(convId);
  if (!conv || !conv.participants.includes(userId)) throw new ApiError(403, "Forbidden");

  await Message.deleteMany({ conversation: convId });
  conv.lastMessage = null;
  await conv.save();
};

// Delete a conversation (for all)
export const deleteConversation = async (convId, userId) => {
  const conv = await Conversation.findById(convId);
  if (!conv || !conv.participants.includes(userId)) throw new ApiError(403, "Forbidden");

  // Only admins can delete group chats, anyone can delete their own DMs
  if (conv.isGroupChat && !conv.admins.includes(userId)) {
    throw new ApiError(403, "Only admins can delete group chats");
  }

  await Promise.all([
    Message.deleteMany({ conversation: convId }),
    Conversation.findByIdAndDelete(convId)
  ]);
};
