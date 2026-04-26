import { Router } from "express";
import * as notif from "./notification.controller.js";
import { protect } from "../../middlewares/auth.middleware.js";

const router = Router();

router.use(protect);

router.get("/",              notif.getNotifications);
router.get("/unread-count",  notif.getUnreadCount);
router.put("/read-all",      notif.markAllRead);
router.put("/:id/read",      notif.markOneRead);
router.delete("/",           notif.clearAll);
router.delete("/:id",        notif.deleteOne);

export default router;
