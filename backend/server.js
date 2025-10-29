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

// Middleware to handle CORS
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || "";
const allowedOrigins = allowedOriginsEnv
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Optional: allow any Vercel preview URL that starts with your project prefix.
// WARNING: use this only if you're okay allowing previews under that pattern.
const allowVercelPreview = true;
const vercelPreviewRegex = /^https:\/\/interview-prep.*\.vercel\.app$/i;

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (curl, server-to-server) that have no origin
    if (!origin) return callback(null, true);

    // exact match against env list
    if (allowedOrigins.includes(origin)) return callback(null, true);

    // optional: allow vercel previews matching pattern
    if (allowVercelPreview && vercelPreviewRegex.test(origin))
      return callback(null, true);

    // otherwise block
    return callback(new Error("CORS not allowed by server: " + origin));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true, // needed if you use cookies
};

// Apply CORS middleware and ensure preflight handled
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

connectDB();

// Middleware
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/questions", questionRoutes);

app.use("/api/ai/generate-questions", protect, generateInterviewQuestions);
app.use("/api/ai/generate-explanation", protect, generateConceptExplanation);

// Serve uploads folder
app.use("/uploads", express.static(path.join(__dirname, "uploads"), {}));

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
