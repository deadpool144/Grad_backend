import { Router } from "express";
import * as notif from "../controllers/notification.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(protect);

router.get("/",            notif.getNotifications);
router.put("/read-all",    notif.markAllRead);
router.delete("/clear",    notif.clearAll);
router.put("/:id/read",    notif.markOneRead);
router.delete("/:id",      notif.deleteOne);

export default router;
