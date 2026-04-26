import Notification from "../../models/Notification.js";
import { parsePage, paginateResult } from "../../utils/paginate.js";

export const getNotifications = async (userId, queryParams = {}) => {
  const { page, limit, skip } = parsePage(queryParams);

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find({ receiver: userId })
      .populate("sender", "firstName lastName avatar")
      .populate("post",   "content")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments({ receiver: userId }),
    Notification.countDocuments({ receiver: userId, read: false }),
  ]);

  return { ...paginateResult(notifications, total, page, limit), unreadCount };
};

export const getUnreadCount = async (userId) =>
  Notification.countDocuments({ receiver: userId, read: false });

export const markAllRead = async (userId) =>
  Notification.updateMany({ receiver: userId, read: false }, { $set: { read: true } });

export const markOneRead = async (notifId, userId) =>
  Notification.findOneAndUpdate({ _id: notifId, receiver: userId }, { $set: { read: true } });

export const clearAll = async (userId) =>
  Notification.deleteMany({ receiver: userId });

export const deleteOne = async (notifId, userId) =>
  Notification.deleteOne({ _id: notifId, receiver: userId });
