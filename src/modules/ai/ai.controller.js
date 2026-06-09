import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolves python executable path, prioritizes local virtual environment if it exists
const getPythonCmd = () => {
  const unixVenv = path.resolve(__dirname, "../../../venv/bin/python");
  const winVenv = path.resolve(__dirname, "../../../venv/Scripts/python.exe");

  if (fs.existsSync(unixVenv)) {
    return unixVenv;
  }
  if (fs.existsSync(winVenv)) {
    return winVenv;
  }
  return process.platform === "win32" ? "py" : "python";
};

export const chat = asyncHandler(async (req, res) => {
  if (process.env.ENABLE_AI === "false") {
    return res.status(200).json(new ApiResponse(200, { response: "AI features are currently disabled in this environment." }, "AI Disabled"));
  }

  const { message } = req.body;

  if (!message) {
    throw new ApiError(400, "Message is required.");
  }

  const scriptPath = path.resolve(
    __dirname,
    "../../ai_integration/chatmodel.py"
  );

  const pythonCmd = getPythonCmd();

  console.log(`[AI] Starting process: ${pythonCmd} ${scriptPath}`);
  console.log(`[AI] Message length: ${message.length}`);

  const pythonProcess = spawn(pythonCmd, [scriptPath], {
    shell: false,
    env: { ...process.env, GOOGLE_API_KEY: process.env.GOOGLE_API_KEY }
  });

  let result = "";
  let error = "";
  let responseSent = false;

  // Send message via stdin with history context
  let history = req.body.history || [];
  if (typeof history === 'string') {
    try { history = JSON.parse(history); } catch (e) { history = []; }
  }
  const contextText = history.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n");
  const fullPrompt = `CHAT HISTORY:\n${contextText}\n\nCURRENT REQUEST:\n${message}`;

  console.log(`[AI] Full prompt total length: ${fullPrompt.length}`);

  pythonProcess.stdin.write(fullPrompt);
  pythonProcess.stdin.end();

  pythonProcess.stdout.on("data", (data) => {
    result += data.toString();
  });

  pythonProcess.stderr.on("data", (data) => {
    error += data.toString();
    console.error(`[AI Python Error]: ${data}`);
  });

  const timeout = setTimeout(() => {
    console.warn("[AI] Process timed out after 180s");
    pythonProcess.kill();
  }, 180000);

  pythonProcess.on("close", (code) => {
    clearTimeout(timeout);
    if (responseSent) return;
    responseSent = true;

    if (code !== 0 && code !== null) {
      console.error(`[AI] Process exited with code ${code}. Error: ${error}`);
      return res.status(500).json(
        new ApiResponse(500, null, error || "Trouble Encountered")
      );
    }

    if (code === null) {
      return res.status(500).json(new ApiResponse(500, null, "Request timed out."));
    }

    try {
      // Find the first { and last } to extract JSON if there's other text
      const start = result.indexOf("{");
      const end = result.lastIndexOf("}");
      if (start === -1 || end === -1) {
        console.error("[AI] No JSON found in:", result);
        throw new Error("No JSON found");
      }

      const jsonStr = result.substring(start, end + 1);
      const parsed = JSON.parse(jsonStr);

      if (parsed.error) {
        return res.status(500).json(new ApiResponse(500, null, parsed.error));
      }

      return res.json(new ApiResponse(200, parsed, "AI response"));
    } catch (e) {
      console.error("[AI] JSON Parse Error:", e.message, "Result was:", result);
      return res.json(
        new ApiResponse(200, { response: result.trim() }, "AI response (fallback)")
      );
    }
  });

  pythonProcess.on("error", (err) => {
    if (responseSent) return;
    responseSent = true;
    console.error("[AI] Spawn Error:", err);
    return res.status(500).json(
      new ApiResponse(500, null, `Failed to start AI process: ${err.message}`)
    );
  });
});

export const analyze = asyncHandler(async (req, res) => {
  if (process.env.ENABLE_AI === "false") {
    return res.status(200).json(new ApiResponse(200, { response: "AI Analysis is currently disabled in this environment." }, "AI Disabled"));
  }

  const { message } = req.body;
  const file = req.file;

  let tempPath = null;
  let combinedPrompt = message || "Please analyze this content.";

  if (file) {
    const tempDir = path.join(__dirname, "../../../../uploads/temp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    tempPath = path.join(tempDir, `${uuidv4()}_${file.originalname}`);
    fs.writeFileSync(tempPath, file.buffer);

    // Use the Python extraction protocol
    combinedPrompt = `FILE_PATH:${tempPath}|||${message || "Analyze this document."}`;
  } else if (message) {
    combinedPrompt = message;
  } else {
    throw new ApiError(400, "Nothing to analyze. Provide text or a file.");
  }

  const scriptPath = path.resolve(__dirname, "../../ai_integration/chatmodel.py");
  const pythonCmd = getPythonCmd();

  console.log(`[AI-Analyze] Starting process for: ${file ? file.originalname : "Text Only"}`);

  const pythonProcess = spawn(pythonCmd, [scriptPath], {
    shell: false,
    env: { ...process.env, GOOGLE_API_KEY: process.env.GOOGLE_API_KEY }
  });

  let result = "";
  let error = "";
  let responseSent = false;

  // Send context (history) + message via stdin
  let history = req.body.history || [];
  if (typeof history === 'string') {
    try { history = JSON.parse(history); } catch (e) { history = []; }
  }
  const contextText = history.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n");
  const fullPrompt = `CHAT HISTORY:\n${contextText}\n\nCURRENT REQUEST:\n${combinedPrompt}`;

  pythonProcess.stdin.write(fullPrompt);
  pythonProcess.stdin.end();

  pythonProcess.stdout.on("data", (data) => { result += data.toString(); });
  pythonProcess.stderr.on("data", (data) => { error += data.toString(); });

  const timeout = setTimeout(() => {
    console.warn("[AI-Analyze] Process timed out after 180s");
    pythonProcess.kill();
  }, 180000);

  pythonProcess.on("close", (code) => {
    clearTimeout(timeout);
    if (responseSent) return;
    responseSent = true;

    // Cleanup temp file
    if (tempPath && fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch (e) { console.error("Temp cleanup error:", e); }
    }

    if (code !== 0 && code !== null) {
      console.error(`[AI-Analyze] Error Code ${code}:`, error);
      return res.status(500).json(new ApiResponse(500, null, error || "Trouble Encountered"));
    }

    if (code === null) {
      console.error("[AI-Analyze] Process was killed (timeout or manual)");
      return res.status(500).json(new ApiResponse(500, null, "Request timed out. Please try again."));
    }

    try {
      const start = result.indexOf("{");
      const end = result.lastIndexOf("}");
      if (start === -1) {
        console.error("[AI-Analyze] No JSON found. Raw output:", result);
        throw new Error("No JSON in output");
      }
      const jsonStr = result.substring(start, end + 1);
      const parsed = JSON.parse(jsonStr);

      if (parsed.error) {
        return res.status(500).json(new ApiResponse(500, null, parsed.error));
      }

      return res.json(new ApiResponse(200, parsed, "Analysis complete"));
    } catch (e) {
      console.error("[AI-Analyze] Fallback triggered. Error:", e.message);
      return res.json(new ApiResponse(200, { response: result.trim() }, "Analysis complete (fallback)"));
    }
  });

  pythonProcess.on("error", (err) => {
    if (responseSent) return;
    responseSent = true;
    console.error("[AI] Spawn Error:", err);
    return res.status(500).json(
      new ApiResponse(500, null, `Failed to start AI process: ${err.message}`)
    );
  });
});