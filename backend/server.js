// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const questionRoutes = require("./routes/questionRoutes");
const { protect } = require("./middlewares/authMiddleware");
const {
  generateInterviewQuestions,
  generateConceptExplanation,
} = require("./controllers/aiController");

const app = express();

/**
 * CORS Setup
 * - ALLOWED_ORIGINS: comma-separated list WITHOUT trailing slashes.
 *   e.g. https://your-production-domain.com,https://interview-prep-abc.vercel.app
 */
const rawAllowed = process.env.ALLOWED_ORIGINS || "";
const allowedOrigins = rawAllowed
  .split(",")
  .map((s) => s.trim().replace(/\/$/, "")) // remove trailing slash if any
  .filter(Boolean);

// Only allow vercel preview in non-production by env flag
const allowVercelPreview =
  process.env.ALLOW_VERCEL_PREVIEW === "true" &&
  process.env.NODE_ENV !== "production";
const vercelPreviewRegex = /^https:\/\/interview-prep.*\.vercel\.app$/i;

console.log("ALLOWED_ORIGINS:", allowedOrigins);
console.log("ALLOW_VERCEL_PREVIEW:", allowVercelPreview);

// cors options
const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (curl, server-to-server)
    if (!origin) return callback(null, true);

    // exact match
    if (allowedOrigins.includes(origin)) return callback(null, true);

    // allow vercel previews if enabled
    if (allowVercelPreview && vercelPreviewRegex.test(origin))
      return callback(null, true);

    // deny: tell cors middleware to reject the origin
    return callback(null, false);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
};

// Apply CORS and preflight handler
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// Simple middleware to return 403 for disallowed origins (helps debugging)
app.use((req, res, next) => {
  const origin = req.get("origin");
  if (origin) {
    const allowed =
      allowedOrigins.includes(origin) ||
      (allowVercelPreview && vercelPreviewRegex.test(origin));
    if (!allowed) {
      return res
        .status(403)
        .json({ success: false, message: "CORS not allowed: " + origin });
    }
  }
  next();
});

// Connect DB
connectDB();

// Middleware
app.use(express.json());

// Routes - ensure these are routers, not strings/URLs
app.use("/api/auth", authRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/questions", questionRoutes);

// Be explicit with HTTP methods for AI endpoints
app.post("/api/ai/generate-questions", protect, generateInterviewQuestions);
app.post("/api/ai/generate-explanation", protect, generateConceptExplanation);

// Serve uploads folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Basic health route
app.get("/health", (req, res) => res.json({ ok: true }));

// Global error handler (simple)
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err && err.stack ? err.stack : err);
  if (res.headersSent) return next(err);
  res.status(err && err.status ? err.status : 500).json({
    success: false,
    message: err && err.message ? err.message : "Internal Server Error",
  });
});

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(
    `Server running on port ${PORT} (env: ${
      process.env.NODE_ENV || "development"
    })`
  );
});

// Handle unhandled rejections / uncaught exceptions
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  // In production you might want to crash the process and let a process manager restart it.
});
