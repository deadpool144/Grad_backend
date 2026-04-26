import * as postService from "../services/post.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const getFeed = asyncHandler(async (req, res) => {
  const posts = await postService.getFeed(req.user._id, req.query.page, req.query.limit);
  res.json(new ApiResponse(200, posts));
});

export const createPost = asyncHandler(async (req, res) => {
  const post = await postService.createPost(req.user._id, req.body, req.files || []);
  res.status(201).json(new ApiResponse(201, post, "Post created"));
});

export const deletePost = asyncHandler(async (req, res) => {
  await postService.deletePost(req.params.id, req.user._id);
  res.json(new ApiResponse(200, null, "Post deleted"));
});

export const toggleLike = asyncHandler(async (req, res) => {
  const result = await postService.toggleLike(req.params.id, req.user._id);
  res.json(new ApiResponse(200, result));
});

export const getComments = asyncHandler(async (req, res) => {
  const comments = await postService.getComments(req.params.id);
  res.json(new ApiResponse(200, comments));
});

export const addComment = asyncHandler(async (req, res) => {
  const comment = await postService.addComment(req.params.id, req.user._id, req.body.text);
  res.status(201).json(new ApiResponse(201, comment, "Comment added"));
});
