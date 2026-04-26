import * as notifService from "../services/notification.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const getNotifications = asyncHandler(async (req, res) => {
  const notifs = await notifService.getNotifications(req.user._id, req.query.page);
  const unread = await notifService.getUnreadCount(req.user._id);
  res.json(new ApiResponse(200, { notifs, unread }));
});

export const markAllRead = asyncHandler(async (req, res) => {
  await notifService.markAllRead(req.user._id);
  res.json(new ApiResponse(200, null, "All marked as read"));
});

export const markOneRead = asyncHandler(async (req, res) => {
  await notifService.markOneRead(req.params.id, req.user._id);
  res.json(new ApiResponse(200, null));
});

export const clearAll = asyncHandler(async (req, res) => {
  await notifService.clearAll(req.user._id);
  res.json(new ApiResponse(200, null, "Notifications cleared"));
});

export const deleteOne = asyncHandler(async (req, res) => {
  await notifService.deleteOne(req.user._id, req.params.id);
  res.json(new ApiResponse(200, null, "Notification deleted"));
});
