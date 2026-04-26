import { Router } from "express";
import * as event from "./event.controller.js";
import { protect } from "../../middlewares/auth.middleware.js";
import { uploadSingle } from "../../middlewares/upload.middleware.js";

const router = Router();

router.use(protect);

router.get("/",          event.getEvents);
router.get("/:id",       event.getEventById);
router.post("/",         uploadSingle, event.createEvent);
router.put("/:id",       uploadSingle, event.updateEvent);
router.delete("/:id",    event.deleteEvent);
router.post("/:id/attend", event.toggleAttend);

export default router;
