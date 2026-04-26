import Post from "../models/post.model.js";
import Comment from "../models/comment.model.js";
import Notification from "../models/notification.model.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadBuffer, deleteFile } from "../config/cloudinary.js";
import User from "../models/user.model.js";

// Feed — Discovery Feed (Global) with privacy filtering
export const getFeed = async (userId, page = 1, limit = 10) => {
  const me = await User.findById(userId).select("blockedUsers");
  const blocked = me?.blockedUsers || [];

  // Discovery Feed: Show all recent posts, but hide blocked content
  const posts = await Post.find({ 
    author: { $nin: blocked } 
  })
    .populate({
      path: "author",
      select: "firstName lastName avatar headline blockedUsers",
      match: { blockedUsers: { $ne: userId } } // Filter out authors who blocked current user
    })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  // Filter out any posts where population failed because authors blocked us
  const filteredPosts = posts.filter(p => p.author !== null);

  // Attach comment count
  const ids = filteredPosts.map((p) => p._id);
  const commentCounts = await Comment.aggregate([
    { $match: { post: { $in: ids } } },
    { $group: { _id: "$post", count: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(commentCounts.map((c) => [c._id.toString(), c.count]));

  return filteredPosts.map((p) => ({ ...p, commentCount: countMap[p._id.toString()] || 0 }));
};

// Create post with optional media
export const createPost = async (userId, { content }, files = []) => {
  const media = await Promise.all(
    files.map(async (f) => {
      const type = f.mimetype.startsWith("video") ? "video" : "image";
      const res = await uploadBuffer(f.buffer, "posts", type);
      return { 
        url: res.secure_url, 
        publicId: res.public_id,
        type: type
      };
    })
  );

  return Post.create({ author: userId, content, media });
};

// Delete post (owner only)
export const deletePost = async (postId, userId, isAdmin = false) => {
  const post = await Post.findById(postId);
  if (!post) throw new ApiError(404, "Post not found");
  
  // Check permission (owner or admin)
  if (!isAdmin && post.author.toString() !== userId.toString()) {
    throw new ApiError(403, "Not allowed to delete this post");
  }

  // Cleanup Cloudinary
  if (post.media && post.media.length > 0) {
    await Promise.all(post.media.map(m => m.publicId && deleteFile(m.publicId)));
  }

  await Comment.deleteMany({ post: postId });
  await post.deleteOne();
};

// Toggle like
export const toggleLike = async (postId, userId) => {
  const post = await Post.findById(postId);
  if (!post) throw new ApiError(404, "Post not found");

  const liked = post.likes.includes(userId);
  if (liked) {
    post.likes.pull(userId);
  } else {
    post.likes.push(userId);
    if (post.author.toString() !== userId.toString()) {
      await Notification.create({
        receiver: post.author,
        sender: userId,
        type: "like",
        post: postId,
        text: "liked your post",
      });
    }
  }
  await post.save();
  return { liked: !liked, likeCount: post.likes.length };
};

// Get comments for a post
export const getComments = async (postId) => {
  return Comment.find({ post: postId })
    .populate("author", "firstName lastName avatar")
    .sort({ createdAt: 1 });
};

// Add comment
export const addComment = async (postId, userId, text) => {
  const post = await Post.findById(postId);
  if (!post) throw new ApiError(404, "Post not found");

  const comment = await Comment.create({ post: postId, author: userId, text });
  await comment.populate("author", "firstName lastName avatar");

  if (post.author.toString() !== userId.toString()) {
    await Notification.create({
      receiver: post.author,
      sender: userId,
      type: "comment",
      post: postId,
      text: "commented on your post",
    });
  }

  return comment;
};
