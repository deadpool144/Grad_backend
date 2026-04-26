import { Router } from "express";
import * as user from "./user.controller.js";
import { protect } from "../../middlewares/auth.middleware.js";
import { uploadSingle } from "../../middlewares/upload.middleware.js";

const router = Router();

router.use(protect);

// Search & discovery
router.get("/search",      user.searchUsers);
router.get("/directory",   user.getDirectory);
router.get("/suggestions", user.getSuggestedUsers);

// Profile (self or others)
router.get("/:id",         user.getProfile);
router.put("/",            user.updateProfile);
router.post("/avatar",     uploadSingle, user.uploadAvatar);
router.post("/cover",      uploadSingle, user.uploadCover);

// Connections
router.get("/:id/connections",        user.getConnections);
router.get("/:id/connection-status",  user.getConnectionStatus);
router.post("/:id/connect",           user.sendConnectionRequest);
router.delete("/:id/connect",         user.removeConnection);
router.post("/:id/respond",           user.respondToConnection);

// Block
router.post("/:id/block", user.toggleBlockUser);

export default router;
