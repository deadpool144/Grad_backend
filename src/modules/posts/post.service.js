import Post from "../../models/Post.js";
import Comment from "../../models/Comment.js";
import User from "../../models/User.js";
import { ApiError } from "../../utils/ApiError.js";
import { uploadBuffer, deleteFile } from "../../config/cloudinary.js";
import { createAndEmit } from "../../utils/notify.js";
import { parsePage, paginateResult } from "../../utils/paginate.js";

// ─────────────────────────────────────────────────────────────────────────────
// FEED
// ─────────────────────────────────────────────────────────────────────────────
export const getFeed = async (userId, queryParams = {}) => {
  const { page, limit, skip } = parsePage(queryParams, 10);

  const me = await User.findById(userId).select("blockedUsers").lean();
  const blocked = me?.blockedUsers?.map(String) || [];

  // One query — no joined aggregate needed. commentCount is stored on the doc.
  const [posts, total] = await Promise.all([
    Post.find({ author: { $nin: [userId, ...blocked] } })
      .populate({
        path:  "author",
        select: "firstName lastName avatar headline",
        match: { blockedUsers: { $ne: userId }, isVerified: true },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Post.countDocuments({ author: { $nin: [userId, ...blocked] } }),
  ]);

  // Filter posts where populate found no author (blocked reverse)
  const filtered = posts.filter((p) => p.author !== null);
  return paginateResult(filtered, total, page, limit);
};

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE POST
// ─────────────────────────────────────────────────────────────────────────────
export const getPostById = async (postId) => {
  const post = await Post.findById(postId)
    .populate("author", "firstName lastName avatar headline");
  if (!post) throw new ApiError(404, "Post not found.");
  return post;
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────────────────────
export const createPost = async (userId, { content }, files = []) => {
  if (!content?.trim()) throw new ApiError(400, "Post content cannot be empty.");
  if (files.length > 5) throw new ApiError(400, "Maximum 5 files per post.");

  const media = await Promise.all(
    files.map(async (f) => {
      const type   = f.mimetype.startsWith("video") ? "video" : "image";
      const result = await uploadBuffer(f.buffer, "posts", type);
      return { url: result.secure_url, publicId: result.public_id, type };
    })
  );

  const post = await Post.create({ author: userId, content: content.trim(), media });
  await post.populate("author", "firstName lastName avatar headline");
  return post;
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────────────────────
export const deletePost = async (postId, userId, isAdmin = false) => {
  const post = await Post.findById(postId);
  if (!post) throw new ApiError(404, "Post not found.");
  if (!isAdmin && post.author.toString() !== userId.toString())
    throw new ApiError(403, "Not authorized to delete this post.");

  // Delete media from Cloudinary
  if (post.media?.length) {
    await Promise.allSettled(post.media.map((m) => m.publicId && deleteFile(m.publicId)));
  }

  // Delete all comments + the post
  await Promise.all([
    Comment.deleteMany({ post: postId }),
    post.deleteOne(),
  ]);
};

// ─────────────────────────────────────────────────────────────────────────────
// LIKE
// ─────────────────────────────────────────────────────────────────────────────
export const toggleLike = async (postId, userId, io) => {
  const post = await Post.findById(postId).select("likes author");
  if (!post) throw new ApiError(404, "Post not found.");

  const liked = post.likes.some((id) => id.toString() === userId.toString());

  if (liked) {
    await Post.findByIdAndUpdate(postId, { $pull: { likes: userId } });
  } else {
    await Post.findByIdAndUpdate(postId, { $addToSet: { likes: userId } });

    await createAndEmit(io, {
      receiver: post.author,
      sender:   userId,
      type:     "like",
      post:     postId,
      text:     "liked your post",
    });
  }

  const updated = await Post.findById(postId).select("likes");
  return { liked: !liked, likeCount: updated.likes.length };
};

// ─────────────────────────────────────────────────────────────────────────────
// SAVE (BOOKMARK)
// ─────────────────────────────────────────────────────────────────────────────
export const toggleSave = async (postId, userId) => {
  const post = await Post.findById(postId).select("savedBy");
  if (!post) throw new ApiError(404, "Post not found.");

  const saved = post.savedBy.some((id) => id.toString() === userId.toString());

  if (saved) {
    await Post.findByIdAndUpdate(postId, { $pull:     { savedBy: userId } });
  } else {
    await Post.findByIdAndUpdate(postId, { $addToSet: { savedBy: userId } });
  }

  return { saved: !saved };
};

export const getSavedPosts = async (userId, queryParams = {}) => {
  const { page, limit, skip } = parsePage(queryParams, 10);

  const [posts, total] = await Promise.all([
    Post.find({ savedBy: userId })
      .populate("author", "firstName lastName avatar headline")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Post.countDocuments({ savedBy: userId }),
  ]);

  return paginateResult(posts, total, page, limit);
};

// ─────────────────────────────────────────────────────────────────────────────
// SHARE
// ─────────────────────────────────────────────────────────────────────────────
export const sharePost = async (postId, userId, io) => {
  const post = await Post.findByIdAndUpdate(
    postId,
    { $inc: { shares: 1 } },
    { new: true, select: "shares author" }
  );
  if (!post) throw new ApiError(404, "Post not found.");

  await createAndEmit(io, {
    receiver: post.author,
    sender:   userId,
    type:     "like", // reuse like type or add "share" to enum if desired
    post:     postId,
    text:     "shared your post",
  });

  return { shares: post.shares };
};

// ─────────────────────────────────────────────────────────────────────────────
// COMMENTS
// ─────────────────────────────────────────────────────────────────────────────
export const getComments = async (postId, queryParams = {}) => {
  const { page, limit, skip } = parsePage(queryParams, 20);

  const [comments, total] = await Promise.all([
    Comment.find({ post: postId, parentComment: null })
      .populate("author", "firstName lastName avatar")
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Comment.countDocuments({ post: postId, parentComment: null }),
  ]);

  return paginateResult(comments, total, page, limit);
};

export const addComment = async (postId, userId, text, parentCommentId = null, io) => {
  if (!text?.trim()) throw new ApiError(400, "Comment text cannot be empty.");

  const post = await Post.findById(postId).select("author");
  if (!post) throw new ApiError(404, "Post not found.");

  if (parentCommentId) {
    const parent = await Comment.findById(parentCommentId);
    if (!parent || parent.post.toString() !== postId.toString())
      throw new ApiError(404, "Parent comment not found.");
  }

  const [comment] = await Promise.all([
    Comment.create({ post: postId, author: userId, text: text.trim(), parentComment: parentCommentId }),
    Post.findByIdAndUpdate(postId, { $inc: { commentCount: 1 } }), // atomic
  ]);

  await comment.populate("author", "firstName lastName avatar");

  await createAndEmit(io, {
    receiver: post.author,
    sender:   userId,
    type:     "comment",
    post:     postId,
    text:     "commented on your post",
  });

  return comment;
};

export const deleteComment = async (commentId, userId, isAdmin = false) => {
  const comment = await Comment.findById(commentId).select("author post");
  if (!comment) throw new ApiError(404, "Comment not found.");
  if (!isAdmin && comment.author.toString() !== userId.toString())
    throw new ApiError(403, "Not authorized to delete this comment.");

  await Promise.all([
    comment.deleteOne(),
    Post.findByIdAndUpdate(comment.post, { $inc: { commentCount: -1 } }),
    // Also delete replies
    Comment.deleteMany({ parentComment: commentId }),
  ]);
};

export const toggleCommentLike = async (commentId, userId) => {
  const comment = await Comment.findById(commentId).select("likes");
  if (!comment) throw new ApiError(404, "Comment not found.");

  const liked = comment.likes.some((id) => id.toString() === userId.toString());
  if (liked) {
    await Comment.findByIdAndUpdate(commentId, { $pull:     { likes: userId } });
  } else {
    await Comment.findByIdAndUpdate(commentId, { $addToSet: { likes: userId } });
  }
  return { liked: !liked };
};
