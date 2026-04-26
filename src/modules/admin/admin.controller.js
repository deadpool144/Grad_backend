import * as adminService from "./admin.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

export const getStats = asyncHandler(async (req, res) => {
  const stats = await adminService.getStats();
  res.json(new ApiResponse(200, stats));
});

export const getAllUsers = asyncHandler(async (req, res) => {
  const result = await adminService.getAllUsers(req.query);
  res.json(new ApiResponse(200, result));
});

export const updateUserRole = asyncHandler(async (req, res) => {
  const user = await adminService.updateUserRole(req.params.id, req.body.role, req.userId);
  res.json(new ApiResponse(200, user, "Role updated."));
});

export const deleteAnyUser = asyncHandler(async (req, res) => {
  await adminService.deleteAnyUser(req.params.id, req.userId);
  res.json(new ApiResponse(200, null, "User deleted."));
});

export const deleteAnyPost = asyncHandler(async (req, res) => {
  await adminService.deleteAnyPost(req.params.id, req.userId);
  res.json(new ApiResponse(200, null, "Post deleted."));
});

export const deleteAnyEvent = asyncHandler(async (req, res) => {
  await adminService.deleteAnyEvent(req.params.id, req.userId);
  res.json(new ApiResponse(200, null, "Event deleted."));
});
