import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");
const mammoth = require("mammoth");
import Tesseract from "tesseract.js";
import { ApiError } from "../../utils/ApiError.js";

export const extractTextFromFile = async (file) => {
  const { mimetype, buffer } = file;

  try {
    console.log(`[AI Service] Extracting from ${mimetype}, buffer size: ${buffer.length}`);
    
    if (mimetype === "application/pdf") {
      const data = await pdf(buffer);
      console.log(`[AI Service] PDF extraction complete, length: ${data.text.length}`);
      return data.text;
    } 
    
    if (mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const { value } = await mammoth.convertToMarkdown({ buffer });
      console.log(`[AI Service] DOCX extraction complete, length: ${value.length}`);
      return value;
    }

    if (mimetype.startsWith("image/")) {
      console.log(`[AI Service] Starting OCR for image...`);
      const { data: { text } } = await Tesseract.recognize(buffer, "eng");
      console.log(`[AI Service] OCR complete, length: ${text.length}`);
      return text;
    }

    throw new ApiError(400, "Unsupported file type for extraction.");
  } catch (error) {
    console.error("[AI Service] Extraction Error:", error.message);
    throw new ApiError(500, `Failed to extract text: ${error.message}`);
  }
};
