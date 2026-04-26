import { Router } from "express";
import * as post from "../controllers/post.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { uploadMultiple } from "../middlewares/upload.middleware.js";

const router = Router();

router.use(protect);

router.get("/feed",               post.getFeed);
router.post("/",                  uploadMultiple, post.createPost);
router.delete("/:id",             post.deletePost);
router.post("/:id/like",          post.toggleLike);
router.get("/:id/comments",       post.getComments);
router.post("/:id/comments",      post.addComment);

export default router;
