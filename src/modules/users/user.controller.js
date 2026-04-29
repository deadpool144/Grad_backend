import * as userService from "./user.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

export const getProfile = asyncHandler(async (req, res) => {
  const targetId = req.params.id === "me" ? req.userId : req.params.id;
  const user = await userService.getProfile(targetId, req.userId);
  res.json(new ApiResponse(200, user));
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await userService.updateProfile(req.userId, req.body);
  res.json(new ApiResponse(200, user, "Profile updated."));
});

export const uploadAvatar = asyncHandler(async (req, res) => {
  const user = await userService.uploadAvatar(req.userId, req.file);
  res.json(new ApiResponse(200, user, "Avatar updated."));
});

export const uploadCover = asyncHandler(async (req, res) => {
  const user = await userService.uploadCover(req.userId, req.file);
  res.json(new ApiResponse(200, user, "Cover updated."));
});

export const searchUsers = asyncHandler(async (req, res) => {
  const users = await userService.searchUsers(req.query.q, req.userId);
  res.json(new ApiResponse(200, users));
});

export const getDirectory = asyncHandler(async (req, res) => {
  const result = await userService.getDirectory(req.query, req.userId);
  res.json(new ApiResponse(200, result));
});

export const getConnectionStatus = asyncHandler(async (req, res) => {
  const result = await userService.getConnectionStatus(req.userId, req.params.id);
  res.json(new ApiResponse(200, result));
});

export const getConnections = asyncHandler(async (req, res) => {
  const targetId = !req.params.id || req.params.id === "me" ? req.userId : req.params.id;
  const connections = await userService.getConnections(targetId);
  res.json(new ApiResponse(200, connections));
});

export const getPendingRequests = asyncHandler(async (req, res) => {
  const requests = await userService.getPendingRequests(req.userId);
  res.json(new ApiResponse(200, requests));
});

export const sendConnectionRequest = asyncHandler(async (req, res) => {
  await userService.sendConnectionRequest(req.userId, req.params.id, req.app.get("io"));
  res.json(new ApiResponse(200, null, "Connection request sent."));
});

export const respondToConnection = asyncHandler(async (req, res) => {
  await userService.respondToConnection(req.userId, req.params.id, req.body.action, req.app.get("io"));
  res.json(new ApiResponse(200, null, `Request ${req.body.action}ed.`));
});

export const removeConnection = asyncHandler(async (req, res) => {
  await userService.removeConnection(req.userId, req.params.id);
  res.json(new ApiResponse(200, null, "Connection removed."));
});

export const toggleBlockUser = asyncHandler(async (req, res) => {
  const result = await userService.toggleBlockUser(req.userId, req.params.id);
  res.json(new ApiResponse(200, result, result.blocked ? "User blocked." : "User unblocked."));
});

export const getSuggestedUsers = asyncHandler(async (req, res) => {
  const users = await userService.getSuggestedUsers(req.userId, req.query.limit);
  res.json(new ApiResponse(200, users));
});
