import * as eventService from "../services/event.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const getEvents = asyncHandler(async (req, res) => {
  const result = await eventService.getEvents({ 
    page: parseInt(req.query.page) || 1, 
    limit: parseInt(req.query.limit) || 20 
  });
  res.json(new ApiResponse(200, result));
});

export const createEvent = asyncHandler(async (req, res) => {
  const event = await eventService.createEvent(req.user._id, req.body, req.file);
  res.status(201).json(new ApiResponse(201, event, "Event created"));
});

export const deleteEvent = asyncHandler(async (req, res) => {
  await eventService.deleteEvent(req.params.id, req.user._id, req.user.role === "admin");
  res.json(new ApiResponse(200, null, "Event deleted"));
});

export const toggleAttend = asyncHandler(async (req, res) => {
  const result = await eventService.toggleAttend(req.params.id, req.user._id);
  res.json(new ApiResponse(200, result));
});
