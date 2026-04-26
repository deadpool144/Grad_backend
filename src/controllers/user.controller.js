import * as userService from "../services/user.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const getProfile = asyncHandler(async (req, res) => {
  const user = await userService.getProfile(req.params.id === "me" ? req.user._id : req.params.id);
  res.json(new ApiResponse(200, user));
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await userService.updateProfile(req.user._id, req.body);
  res.json(new ApiResponse(200, user, "Profile updated"));
});

export const uploadAvatar = asyncHandler(async (req, res) => {
  const user = await userService.uploadAvatar(req.user._id, req.file);
  res.json(new ApiResponse(200, user, "Avatar updated"));
});

export const uploadCover = asyncHandler(async (req, res) => {
  const user = await userService.uploadCover(req.user._id, req.file);
  res.json(new ApiResponse(200, user, "Cover updated"));
});

export const searchUsers = asyncHandler(async (req, res) => {
  const users = await userService.searchUsers(req.query.q || "", req.user._id);
  res.json(new ApiResponse(200, users));
});

export const getDirectory = asyncHandler(async (req, res) => {
  const data = await userService.getDirectory(req.query, req.user._id);
  res.json(new ApiResponse(200, data));
});

export const sendConnectionRequest = asyncHandler(async (req, res) => {
  await userService.sendConnectionRequest(req.user._id, req.params.id);
  res.json(new ApiResponse(200, null, "Connection request sent"));
});

export const respondToConnection = asyncHandler(async (req, res) => {
  await userService.respondToConnection(req.user._id, req.params.id, req.body.action);
  res.json(new ApiResponse(200, null, "Done"));
});

export const toggleBlockUser = asyncHandler(async (req, res) => {
  const result = await userService.toggleBlockUser(req.user._id, req.params.id);
  res.json(new ApiResponse(200, result, result.blocked ? "User blocked" : "User unblocked"));
});

export const getSuggestedUsers = asyncHandler(async (req, res) => {
  const users = await userService.getSuggestedUsers(req.user._id, req.query.limit || 10);
  res.json(new ApiResponse(200, users));
});

export const removeConnection = asyncHandler(async (req, res) => {
  await userService.removeConnection(req.user._id, req.params.id);
  res.json(new ApiResponse(200, null, "Connection removed"));
});
