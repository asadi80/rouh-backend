
import "dotenv/config";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./db.js";

// ============================================================
// ROUTES
// ============================================================

import authRoutes from "./routes/auth.js";
import doctorsRoutes from "./routes/doctors.js";
import doctorScheduleRoutes from "./routes/doctorSchedule.js";
import servicesRoutes from "./routes/services.js";
import whyUsRoutes from "./routes/whyUs.js";
import workingHoursRoutes from "./routes/workingHours.js";
import settingsRoutes from "./routes/settings.js";
import staffRoutes from "./routes/staff.js";
import jobTitlesRoutes from "./routes/jobTitles.js";
import patientsRoutes from "./routes/patients.js";
import announcementsRoutes from "./routes/announcements.js";
import appointmentRequestsRoutes from "./routes/appointmentRequests.js";
import dashboardRoutes from "./routes/dashboard.js";
import specialtiesRouter from "./routes/specialties.js";
import serverLogsRoutes from "./routes/serverLogs.js";

// ============================================================
// INITIALIZATION
// ============================================================

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const PORT = process.env.PORT || 4000;

console.log("\n========================================");
console.log("🚀 STARTING ROUHLY API");
console.log("========================================");
console.log("📅 Started:", new Date().toISOString());
console.log("🌐 Environment:", process.env.NODE_ENV || "development");
console.log("🟢 Node version:", process.version);
console.log("🔐 JWT secret:", process.env.JWT_SECRET ? "Loaded" : "MISSING");
console.log("🗄️ Database URL:", process.env.DATABASE_URL ? "Loaded" : "MISSING");
console.log("========================================\n");

// ============================================================
// CORS
// ============================================================

const allowedOrigins = [
  "https://dashboard.rouh.ly",
  "https://rouh.ly",
  "https://www.rouh.ly",
  "http://localhost:5173",
  "http://localhost:5174",
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.error("❌ [CORS BLOCKED]", origin);
    return callback(null, false);
  },

  credentials: true,

  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept",
    "Origin",
    "X-Requested-With",
  ],

  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(helmet({ crossOriginResourcePolicy: false }));

app.use(express.json({ limit: "10mb" }));

app.set("trust proxy", 1);

// ============================================================
// REQUEST LOGGING
// ============================================================

app.use((req, res, next) => {
  const startTime = Date.now();

  console.log("\n----------------------------------------");
  console.log(`📥 REQUEST: ${req.method} ${req.originalUrl}`);
  console.log("🌍 Origin:", req.headers.origin || "none");
  console.log("📡 IP:", req.ip);
  console.log("🕒 Time:", new Date().toISOString());

  res.on("finish", () => {
    const duration = Date.now() - startTime;

    const status = res.statusCode;
    const icon = status >= 500 ? "🔴" : status >= 400 ? "🟡" : "🟢";

    console.log(
      `${icon} RESPONSE: ${req.method} ${req.originalUrl} | Status: ${status} | ${duration}ms`
    );

    console.log("----------------------------------------\n");
  });

  res.on("close", () => {
    if (!res.writableFinished) {
      console.error(
        `⚠️ CONNECTION CLOSED BEFORE RESPONSE: ${req.method} ${req.originalUrl}`
      );
    }
  });

  next();
});

// ============================================================
// DATABASE STATUS
// ============================================================

pool.on("connect", () => {
  console.log("🟢 PostgreSQL: New database connection established");
});

pool.on("error", (error) => {
  console.error("🔴 POSTGRES POOL ERROR");
  console.error(error);
});

// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS database_time");

    console.log("🟢 HEALTH CHECK: API and database working");

    res.status(200).json({
      ok: true,
      message: "Rouhly API is working",
      server: "online",
      database: "connected",
      database_time: result.rows[0].database_time,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("🔴 HEALTH CHECK DATABASE ERROR");
    console.error(error);

    res.status(503).json({
      ok: false,
      message: "API is running but database connection failed",
      server: "online",
      database: "disconnected",
      timestamp: new Date().toISOString(),
    });
  }
});

// ============================================================
// API ROUTES
// ============================================================

app.use("/api/auth", authRoutes);
app.use("/api/doctors", doctorsRoutes);
app.use("/api/doctors", doctorScheduleRoutes);
app.use("/api/services", servicesRoutes);
app.use("/api/why-us", whyUsRoutes);
app.use("/api/working-hours", workingHoursRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/job-titles", jobTitlesRoutes);
app.use("/api/patients", patientsRoutes);
app.use("/api/announcements", announcementsRoutes);
app.use("/api/appointment-requests", appointmentRequestsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/specialties", specialtiesRouter);
app.use("/api/server/logs", serverLogsRoutes);

// ============================================================
// UPLOADS
// ============================================================

app.use(
  "/uploads",
  express.static(path.resolve("public/uploads"))
);

// ============================================================
// OPTIONAL CLIENT
// ============================================================

const clientDist = path.join(__dirname, "../../client/dist");

if (process.env.SERVE_CLIENT === "true") {
  console.log("📦 Serving frontend from:", clientDist);

  app.use(express.static(clientDist));

  app.get("*", (req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

// ============================================================
// 404 HANDLER
// ============================================================

app.use((req, res) => {
  console.warn(
    `🟡 ROUTE NOT FOUND: ${req.method} ${req.originalUrl}`
  );

  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
  });
});

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

app.use((err, req, res, next) => {
  console.error("\n========================================");
  console.error("🔴 SERVER ERROR");
  console.error("========================================");
  console.error("Method:", req.method);
  console.error("URL:", req.originalUrl);
  console.error("Time:", new Date().toISOString());
  console.error("Message:", err.message);
  console.error("Code:", err.code || "N/A");
  console.error("Stack:", err.stack);
  console.error("========================================\n");

  if (res.headersSent) {
    return next(err);
  }

  res.status(err.status || 500).json({
    error: "Internal server error",
    message: "حدث خطأ في السيرفر.",
  });
});

// ============================================================
// PROCESS-LEVEL ERROR LOGGING
// ============================================================

process.on("unhandledRejection", (reason) => {
  console.error("\n🔴 UNHANDLED PROMISE REJECTION");
  console.error(reason);
});

process.on("uncaughtException", (error) => {
  console.error("\n🔴 UNCAUGHT EXCEPTION");
  console.error(error.stack || error);

  // Exit so Passenger can restart the application.
  process.exit(1);
});

// ============================================================
// START SERVER
// ============================================================

const server = app.listen(PORT, () => {
  console.log("\n========================================");
  console.log("🟢 ROUHLY API IS RUNNING");
  console.log("========================================");
  console.log(`🌐 Port: ${PORT}`);
  console.log("🔗 Health: /api/health");
  console.log("📊 Request logging: ENABLED");
  console.log("🔴 Error logging: ENABLED");
  console.log("🗄️ Database monitoring: ENABLED");
  console.log("========================================\n");

  // Verify the database at startup.
  pool.query("SELECT NOW()")
    .then(() => {
      console.log("🟢 STARTUP DATABASE CHECK: SUCCESS");
    })
    .catch((error) => {
      console.error("🔴 STARTUP DATABASE CHECK: FAILED");
      console.error(error);
    });
});

server.on("error", (error) => {
  console.error("🔴 SERVER STARTUP ERROR");
  console.error(error);
});

export default app;
