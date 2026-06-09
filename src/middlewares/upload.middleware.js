import multer from "multer";
import { ApiError } from "../utils/ApiError.js";

const ALLOWED_MIME = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "video/mp4", "video/webm", "video/quicktime",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
];

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, `File type "${file.mimetype}" is not allowed`), false);
  }
};

const upload = multer({
  storage: multer.memoryStorage(), // Keep in memory → stream to Cloudinary
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

export const uploadSingle   = upload.single("file");
export const uploadMultiple = upload.array("files", 5);
export const uploadAny      = upload.any();
