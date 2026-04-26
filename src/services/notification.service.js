import Notification from "../models/notification.model.js";

export const getNotifications = async (userId, page = 1, limit = 20) => {
  return Notification.find({ receiver: userId })
    .populate("sender", "firstName lastName avatar")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

export const getUnreadCount = async (userId) => {
  return Notification.countDocuments({ receiver: userId, read: false });
};

export const markAllRead = async (userId) => {
  await Notification.updateMany({ receiver: userId, read: false }, { read: true });
};

export const markOneRead = async (notifId, userId) => {
  await Notification.findOneAndUpdate({ _id: notifId, receiver: userId }, { read: true });
};

export const clearAll = async (userId) => {
  await Notification.deleteMany({ receiver: userId });
};

export const deleteOne = async (userId, notifId) => {
  await Notification.deleteOne({ _id: notifId, receiver: userId });
};
