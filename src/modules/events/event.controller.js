import * as eventService from "./event.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

export const getEvents = asyncHandler(async (req, res) => {
  const result = await eventService.getEvents(req.query);
  res.json(new ApiResponse(200, result));
});

export const getEventById = asyncHandler(async (req, res) => {
  const event = await eventService.getEventById(req.params.id);
  res.json(new ApiResponse(200, event));
});

export const createEvent = asyncHandler(async (req, res) => {
  const event = await eventService.createEvent(req.userId, req.body, req.file);
  res.status(201).json(new ApiResponse(201, event, "Event created."));
});

export const updateEvent = asyncHandler(async (req, res) => {
  const event = await eventService.updateEvent(req.params.id, req.userId, req.body, req.file);
  res.json(new ApiResponse(200, event, "Event updated."));
});

export const deleteEvent = asyncHandler(async (req, res) => {
  await eventService.deleteEvent(req.params.id, req.userId);
  res.json(new ApiResponse(200, null, "Event deleted."));
});

export const toggleAttend = asyncHandler(async (req, res) => {
  const result = await eventService.toggleAttend(req.params.id, req.userId);
  res.json(new ApiResponse(200, result));
});
