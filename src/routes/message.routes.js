import { Router } from "express";
import * as msg from "../controllers/message.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { uploadSingle } from "../middlewares/upload.middleware.js";

const router = Router();

router.use(protect);

router.post("/dm",             msg.accessDM);
router.post("/group",          msg.createGroup);
router.get("/",                msg.getConversations);
router.get("/:id",             msg.getMessages);
router.post("/:id",            uploadSingle, msg.sendMessage);
router.put("/:id/read",        msg.markRead);
router.delete("/:id/clear",    msg.clearMessages);
router.delete("/:id",          msg.deleteConversation);

export default router;
