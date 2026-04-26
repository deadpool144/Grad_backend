import { Router } from "express";
import * as post from "./post.controller.js";
import { protect } from "../../middlewares/auth.middleware.js";
import { uploadMultiple } from "../../middlewares/upload.middleware.js";

const router = Router();

router.use(protect);

// Feed & saved
router.get("/feed",  post.getFeed);
router.get("/saved", post.getSavedPosts);

// Individual post
router.get("/:id",          post.getPostById);
router.post("/",            uploadMultiple, post.createPost);
router.delete("/:id",       post.deletePost);

// Engagement
router.post("/:id/like",    post.toggleLike);
router.post("/:id/save",    post.toggleSave);
router.post("/:id/share",   post.sharePost);

// Comments
router.get("/:id/comments",                    post.getComments);
router.post("/:id/comments",                   post.addComment);
router.delete("/:id/comments/:commentId",      post.deleteComment);
router.post("/:id/comments/:commentId/like",   post.toggleCommentLike);

export default router;
