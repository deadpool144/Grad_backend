import Event from "../../models/Event.js";
import { uploadBuffer, deleteFile } from "../../config/cloudinary.js";
import { ApiError } from "../../utils/ApiError.js";
import { parsePage, paginateResult } from "../../utils/paginate.js";

const ALLOWED_FIELDS = [
  "title", "description", "date", "endDate", "location",
  "virtualLink", "isOnline", "capacity", "category",
];

// ─────────────────────────────────────────────────────────────────────────────
// LIST
// ─────────────────────────────────────────────────────────────────────────────
export const getEvents = async (queryParams = {}) => {
  const { page, limit, skip } = parsePage(queryParams);
  const { category, isOnline, upcoming } = queryParams;

  const filter = {};
  if (category)           filter.category = category;
  if (isOnline !== undefined) filter.isOnline = isOnline === "true";
  if (upcoming  === "true")  filter.date = { $gte: new Date() };

  const [events, total] = await Promise.all([
    Event.find(filter)
      .populate("organizer", "firstName lastName avatar headline")
      .sort({ date: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Event.countDocuments(filter),
  ]);

  return paginateResult(events, total, page, limit);
};

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE EVENT
// ─────────────────────────────────────────────────────────────────────────────
export const getEventById = async (eventId) => {
  const event = await Event.findById(eventId)
    .populate("organizer", "firstName lastName avatar")
    .populate("attendees",  "firstName lastName avatar");
  if (!event) throw new ApiError(404, "Event not found.");
  return event;
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────────────────────
export const createEvent = async (userId, body, file) => {
  // Whitelist fields to prevent field injection
  const data = {};
  ALLOWED_FIELDS.forEach((key) => { if (body[key] !== undefined) data[key] = body[key]; });

  if (!data.title)       throw new ApiError(400, "Event title is required.");
  if (!data.description) throw new ApiError(400, "Event description is required.");
  if (!data.date)        throw new ApiError(400, "Event date is required.");

  if (file) {
    const result = await uploadBuffer(file.buffer, "events", "image");
    data.coverImage    = result.secure_url;
    data.coverPublicId = result.public_id;
  }

  const event = await Event.create({ ...data, organizer: userId });
  await event.populate("organizer", "firstName lastName avatar");
  return event;
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────────────────────
export const updateEvent = async (eventId, userId, body, file, isAdmin = false) => {
  const event = await Event.findById(eventId);
  if (!event) throw new ApiError(404, "Event not found.");
  if (!isAdmin && event.organizer.toString() !== userId.toString())
    throw new ApiError(403, "Not authorized to edit this event.");

  const data = {};
  ALLOWED_FIELDS.forEach((key) => { if (body[key] !== undefined) data[key] = body[key]; });

  if (file) {
    if (event.coverPublicId) await deleteFile(event.coverPublicId);
    const result = await uploadBuffer(file.buffer, "events", "image");
    data.coverImage    = result.secure_url;
    data.coverPublicId = result.public_id;
  }

  return Event.findByIdAndUpdate(eventId, data, { new: true })
    .populate("organizer", "firstName lastName avatar");
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────────────────────
export const deleteEvent = async (eventId, userId, isAdmin = false) => {
  const event = await Event.findById(eventId);
  if (!event) throw new ApiError(404, "Event not found.");
  if (!isAdmin && event.organizer.toString() !== userId.toString())
    throw new ApiError(403, "Not authorized to delete this event.");

  if (event.coverPublicId) await deleteFile(event.coverPublicId);
  await event.deleteOne();
};

// ─────────────────────────────────────────────────────────────────────────────
// ATTEND
// ─────────────────────────────────────────────────────────────────────────────
export const toggleAttend = async (eventId, userId) => {
  const event = await Event.findById(eventId).select("attendees capacity");
  if (!event) throw new ApiError(404, "Event not found.");

  const attending = event.attendees.some((id) => id.toString() === userId.toString());

  if (attending) {
    await Event.findByIdAndUpdate(eventId, { $pull: { attendees: userId } });
    return { attending: false, count: event.attendees.length - 1 };
  }

  // Capacity check
  if (event.capacity > 0 && event.attendees.length >= event.capacity) {
    throw new ApiError(400, "Event is at full capacity.");
  }

  await Event.findByIdAndUpdate(eventId, { $addToSet: { attendees: userId } });
  return { attending: true, count: event.attendees.length + 1 };
};
