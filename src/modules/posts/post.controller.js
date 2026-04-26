import * as postService from "./post.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

export const getFeed = asyncHandler(async (req, res) => {
  const result = await postService.getFeed(req.userId, req.query);
  res.json(new ApiResponse(200, result));
});

export const getPostById = asyncHandler(async (req, res) => {
  const post = await postService.getPostById(req.params.id);
  res.json(new ApiResponse(200, post));
});

export const createPost = asyncHandler(async (req, res) => {
  const post = await postService.createPost(req.userId, req.body, req.files || []);
  res.status(201).json(new ApiResponse(201, post, "Post published."));
});

export const deletePost = asyncHandler(async (req, res) => {
  await postService.deletePost(req.params.id, req.userId);
  res.json(new ApiResponse(200, null, "Post deleted."));
});

export const toggleLike = asyncHandler(async (req, res) => {
  const result = await postService.toggleLike(req.params.id, req.userId, req.app.get("io"));
  res.json(new ApiResponse(200, result));
});

export const toggleSave = asyncHandler(async (req, res) => {
  const result = await postService.toggleSave(req.params.id, req.userId);
  res.json(new ApiResponse(200, result));
});

export const getSavedPosts = asyncHandler(async (req, res) => {
  const result = await postService.getSavedPosts(req.userId, req.query);
  res.json(new ApiResponse(200, result));
});

export const sharePost = asyncHandler(async (req, res) => {
  const result = await postService.sharePost(req.params.id, req.userId, req.app.get("io"));
  res.json(new ApiResponse(200, result, "Post shared."));
});

export const getComments = asyncHandler(async (req, res) => {
  const result = await postService.getComments(req.params.id, req.query);
  res.json(new ApiResponse(200, result));
});

export const addComment = asyncHandler(async (req, res) => {
  const comment = await postService.addComment(
    req.params.id, req.userId, req.body.text, req.body.parentCommentId, req.app.get("io")
  );
  res.status(201).json(new ApiResponse(201, comment, "Comment added."));
});

export const deleteComment = asyncHandler(async (req, res) => {
  await postService.deleteComment(req.params.commentId, req.userId);
  res.json(new ApiResponse(200, null, "Comment deleted."));
});

export const toggleCommentLike = asyncHandler(async (req, res) => {
  const result = await postService.toggleCommentLike(req.params.commentId, req.userId);
  res.json(new ApiResponse(200, result));
});
