import { Router } from "express";
import { 
  getFeed, getAllPosts, getSavedPosts, getUserPosts, getPostById, 
  createPost, updatePost, deletePost, toggleLike, 
  toggleSave, sharePost, getComments, addComment, 
  deleteComment, toggleCommentLike 
} from "./post.controller.js";
import { protect } from "../../middlewares/auth.middleware.js";
import { uploadMultiple } from "../../middlewares/upload.middleware.js";

const router = Router();

router.use(protect);

// Feed & saved
router.get("/feed",  getFeed);
router.get("/",     getAllPosts);
router.get("/saved", getSavedPosts);
router.get("/user/:id", getUserPosts);

// Individual post
router.get("/:id",          getPostById);
router.post("/",            uploadMultiple, createPost);
router.put("/:id",          uploadMultiple, updatePost);
router.delete("/:id",       deletePost);

// Engagement
router.post("/:id/like",    toggleLike);
router.post("/:id/save",    toggleSave);
router.post("/:id/share",   sharePost);

// Comments
router.get("/:id/comments",                    getComments);
router.post("/:id/comments",                   addComment);
router.delete("/:id/comments/:commentId",      deleteComment);
router.post("/:id/comments/:commentId/like",   toggleCommentLike);

export default router;
