import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";

let configured = false;

const ensureConfig = () => {
  if (configured) return;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  configured = true;
};

/**
 * Upload a Buffer to Cloudinary.
 * Auto quality/format reduces storage and bandwidth.
 *
 * @param {Buffer} buffer
 * @param {string} folder       e.g. "posts", "avatars"
 * @param {string} resourceType "image" | "video" | "auto"
 * @returns {Promise<{ secure_url: string, public_id: string }>}
 */
export const uploadBuffer = (buffer, folder = "general", resourceType = "auto") => {
  ensureConfig();

  if (!process.env.CLOUDINARY_API_KEY) {
    return Promise.reject(new Error("Media upload service is not configured."));
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        transformation: resourceType !== "video"
          ? [{ quality: "auto", fetch_format: "auto" }]
          : undefined,
      },
      (error, result) => {
        if (error) {
          console.error("❌ Cloudinary upload error:", error.message);
          return reject(new Error("Failed to upload file. Please try again."));
        }
        resolve({ secure_url: result.secure_url, public_id: result.public_id });
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

/**
 * Delete a file from Cloudinary by public_id.
 * Fails silently to avoid crashing the main request on cleanup.
 *
 * @param {string} publicId
 */
export const deleteFile = async (publicId) => {
  if (!publicId || !process.env.CLOUDINARY_API_KEY) return;
  ensureConfig();
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error("❌ Cloudinary delete error:", err.message);
  }
};

export default cloudinary;
