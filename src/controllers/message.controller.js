import * as msgService from "../services/message.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { emitToUser } from "../socket/index.js";

export const accessDM = asyncHandler(async (req, res) => {
  const conv = await msgService.accessDM(req.user._id, req.body.targetId);
  res.json(new ApiResponse(200, conv));
});

export const createGroup = asyncHandler(async (req, res) => {
  const conv = await msgService.createGroup(req.user._id, req.body);
  const io = req.app.get("io");
  conv.participants.forEach((p) => {
    emitToUser(io, p._id || p, "new_conversation", conv);
  });
  res.status(201).json(new ApiResponse(201, conv, "Group created"));
});

export const getConversations = asyncHandler(async (req, res) => {
  const convs = await msgService.getConversations(req.user._id);
  res.json(new ApiResponse(200, convs));
});

export const getMessages = asyncHandler(async (req, res) => {
  const msgs = await msgService.getMessages(req.params.id, req.user._id, req.query.page);
  res.json(new ApiResponse(200, msgs));
});

export const sendMessage = asyncHandler(async (req, res) => {
  const msg = await msgService.sendMessage(req.params.id, req.user._id, req.body, req.file);
  const io = req.app.get("io");
  
  // Emit to all participants
  const conv = await msgService.getConversations(req.user._id).then(c => c.find(x => x._id.toString() === req.params.id));
  if (conv) {
    conv.participants.forEach((p) => {
      emitToUser(io, p._id || p, "new_message", msg);
    });
  }

  res.status(201).json(new ApiResponse(201, msg, "Message sent"));
});

export const markRead = asyncHandler(async (req, res) => {
  await msgService.markRead(req.params.id, req.user._id);
  res.json(new ApiResponse(200, null, "Marked as read"));
});

export const clearMessages = asyncHandler(async (req, res) => {
  await msgService.clearMessages(req.params.id, req.user._id);
  res.json(new ApiResponse(200, null, "Messages cleared"));
});

export const deleteConversation = asyncHandler(async (req, res) => {
  await msgService.deleteConversation(req.params.id, req.user._id);
  res.json(new ApiResponse(200, null, "Conversation deleted"));
});
