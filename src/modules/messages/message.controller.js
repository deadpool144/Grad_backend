import * as msgService from "./message.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

export const accessDM = asyncHandler(async (req, res) => {
  const conv = await msgService.accessDM(req.userId, req.body.targetId);
  res.json(new ApiResponse(200, conv));
});

export const createGroup = asyncHandler(async (req, res) => {
  const conv = await msgService.createGroup(req.userId, req.body);
  // Notify all participants
  const io = req.app.get("io");
  conv.participants.forEach((p) => {
    const pid = (p._id || p).toString();
    io?.to(`user:${pid}`).emit("new_conversation", conv);
  });
  res.status(201).json(new ApiResponse(201, conv, "Group created."));
});

export const getConversations = asyncHandler(async (req, res) => {
  const convs = await msgService.getConversations(req.userId);
  res.json(new ApiResponse(200, convs));
});

export const getMessages = asyncHandler(async (req, res) => {
  const msgs = await msgService.getMessages(req.params.id, req.userId, req.query);
  res.json(new ApiResponse(200, msgs));
});

export const sendMessage = asyncHandler(async (req, res) => {
  const msg = await msgService.sendMessage(
    req.params.id, req.userId, req.body, req.file, req.app.get("io")
  );
  res.status(201).json(new ApiResponse(201, msg, "Message sent."));
});

export const markRead = asyncHandler(async (req, res) => {
  await msgService.markRead(req.params.id, req.userId);
  res.json(new ApiResponse(200, null, "Marked as read."));
});

export const deleteMessage = asyncHandler(async (req, res) => {
  const result = await msgService.deleteMessage(req.params.msgId, req.userId);
  const io = req.app.get("io");
  io?.to(`conv:${req.params.id}`).emit("message_deleted", { msgId: req.params.msgId });
  res.json(new ApiResponse(200, result, "Message deleted."));
});

export const clearMessages = asyncHandler(async (req, res) => {
  await msgService.clearMessages(req.params.id, req.userId);
  res.json(new ApiResponse(200, null, "Chat cleared."));
});

export const deleteConversation = asyncHandler(async (req, res) => {
  await msgService.deleteConversation(req.params.id, req.userId);
  res.json(new ApiResponse(200, null, "Conversation deleted."));
});
