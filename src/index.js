import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";


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

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests without Origin, such as curl/server-side requests
        if (!origin) {
          return callback(null, true);
        }
  
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
  
        return callback(new Error(`CORS blocked: ${origin}`));
      },
      credentials: true,
    })
  );
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(express.json());
app.set("trust proxy", 1);

// ---- API routes ----
app.use("/api/auth", authRoutes);
app.use("/api/doctors", doctorsRoutes);
app.use("/api/doctors", doctorScheduleRoutes); // /api/doctors/:doctorId/schedule
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
app.use(
  "/uploads",
  express.static(path.resolve("public/uploads"))
);

app.get("/api/health", (req, res) => res.json({ ok: true }));

// ---- (اختياري) تقديم ملفات لوحة التحكم المبنية (client/dist) على نفس السيرفر ----
const clientDist = path.join(__dirname, "../../client/dist");
if (process.env.SERVE_CLIENT === "true") {
  app.use(express.static(clientDist));
  app.get("*", (req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

// ---- معالج أخطاء عام ----
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "خطأ في السيرفر." });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Rouh dashboard API running on port ${PORT}`);
});
