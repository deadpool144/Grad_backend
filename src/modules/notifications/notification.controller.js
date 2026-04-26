import * as notifService from "./notification.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

export const getNotifications = asyncHandler(async (req, res) => {
  const result = await notifService.getNotifications(req.userId, req.query);
  res.json(new ApiResponse(200, result));
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await notifService.getUnreadCount(req.userId);
  res.json(new ApiResponse(200, { count }));
});

export const markAllRead = asyncHandler(async (req, res) => {
  await notifService.markAllRead(req.userId);
  res.json(new ApiResponse(200, null, "All notifications marked as read."));
});

export const markOneRead = asyncHandler(async (req, res) => {
  await notifService.markOneRead(req.params.id, req.userId);
  res.json(new ApiResponse(200, null, "Notification marked as read."));
});

export const clearAll = asyncHandler(async (req, res) => {
  await notifService.clearAll(req.userId);
  res.json(new ApiResponse(200, null, "All notifications cleared."));
});

export const deleteOne = asyncHandler(async (req, res) => {
  await notifService.deleteOne(req.params.id, req.userId);
  res.json(new ApiResponse(200, null, "Notification deleted."));
});
