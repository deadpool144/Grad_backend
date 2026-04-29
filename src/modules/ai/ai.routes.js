import { Router } from "express";
import * as aiController from "./ai.controller.js";

import { protect } from "../../middlewares/auth.middleware.js";
import { uploadSingle } from "../../middlewares/upload.middleware.js";

const router = Router();

router.use(protect);
router.post("/chat", aiController.chat);
router.post("/analyze", uploadSingle, aiController.analyze);

export default router;
