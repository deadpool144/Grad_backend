import Event from "../models/event.model.js";
import { uploadBuffer, deleteFile } from "../config/cloudinary.js";
import { ApiError } from "../utils/ApiError.js";

// List all events
export const getEvents = async ({ page = 1, limit = 20 }) => {
  const events = await Event.find()
    .populate("organizer", "firstName lastName avatar headline")
    .sort({ date: 1 })
    .skip((page - 1) * limit)
    .limit(limit);
    
  const total = await Event.countDocuments();
  return { events, total, page, pages: Math.ceil(total / limit) };
};

// Create event
export const createEvent = async (userId, data, file) => {
  let coverImage = "";
  let coverPublicId = "";

  if (file) {
    const result = await uploadBuffer(file.buffer, "events", "image");
    coverImage = result.secure_url;
    coverPublicId = result.public_id;
  }

  return Event.create({
    ...data,
    coverImage,
    coverPublicId,
    organizer: userId,
  });
};

// Delete event
export const deleteEvent = async (eventId, userId, isAdmin = false) => {
  const event = await Event.findById(eventId);
  if (!event) throw new ApiError(404, "Event not found");

  // Check permission (owner or admin)
  if (!isAdmin && event.organizer.toString() !== userId.toString()) {
    throw new ApiError(403, "Not allowed to delete this event");
  }

  // Cleanup Cloudinary
  if (event.coverPublicId) {
    await deleteFile(event.coverPublicId);
  }

  await event.deleteOne();
};

// Join/Leave event
export const toggleAttend = async (eventId, userId) => {
  const event = await Event.findById(eventId);
  if (!event) throw new ApiError(404, "Event not found");

  const attending = event.attendees.includes(userId);
  if (attending) {
    event.attendees.pull(userId);
  } else {
    event.attendees.push(userId);
  }
  
  await event.save();
  return { attending: !attending, count: event.attendees.length };
};
