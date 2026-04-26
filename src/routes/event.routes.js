import { Router } from "express";
import * as event from "../controllers/event.controller.js";
import { protect, isAdmin } from "../middlewares/auth.middleware.js";
import { uploadSingle } from "../middlewares/upload.middleware.js";

const router = Router();

router.get("/",            protect, event.getEvents);
router.post("/",           protect, isAdmin, uploadSingle, event.createEvent);
router.post("/:id/attend", protect, event.toggleAttend);

export default router;
