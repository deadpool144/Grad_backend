import { Router } from "express";
import * as user from "../controllers/user.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { uploadSingle } from "../middlewares/upload.middleware.js";

const router = Router();

router.use(protect); // all user routes require auth

router.get("/search",          user.searchUsers);
router.get("/directory",       user.getDirectory);
router.get("/suggestions",     user.getSuggestedUsers);
router.get("/:id",             user.getProfile);
router.put("/",                user.updateProfile);
router.post("/avatar",         uploadSingle, user.uploadAvatar);
router.post("/cover",          uploadSingle, user.uploadCover);
router.post("/:id/connect",    user.sendConnectionRequest);
router.delete("/:id/connect",  user.removeConnection);
router.post("/:id/respond",    user.respondToConnection);
router.post("/:id/block",      user.toggleBlockUser);

export default router;
