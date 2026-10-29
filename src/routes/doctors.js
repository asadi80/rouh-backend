
import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";

const router = Router();

// Upload directory on the Libyan Spider server.
// Run the backend with its project directory as the working directory.
const uploadDir = path.resolve(
  process.env.UPLOAD_DIR || "public/uploads/doctors"
);

fs.mkdirSync(uploadDir, { recursive: true });

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDir);
  },
  filename: (_req, file, callback) => {
    const ext = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
    }[file.mimetype];

    callback(null, `${crypto.randomUUID()}${ext}`);
  },
});

const imageUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return callback(
        new Error("يسمح فقط بصور JPG وPNG وWebP.")
      );
    }

    callback(null, true);
  },
});

const fields = [
  "name",
  "title",
  "specialty",
  "initials",
  "gender",
  "image_url",
  "bio",
  "medical_school",
  "degree",
  "graduation_year",
  "postgraduate_qualifications",
  "residency_fellowship",
  "board_certifications",
  "subspecialty",
  "years_experience",
  "languages",
  "clinic_affiliation",
  "medical_license_number",
  "is_active",
  "sort_order",
];

const requiredFields = [
  "name",
  "title",
  "specialty",
  "initials",
];

function normalizeValue(field, value) {
  if (value === undefined) return undefined;

  if (field === "languages") {
    if (Array.isArray(value)) {
      return value
        .filter((item) => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    if (typeof value === "string") {
      return value.split(",").map((item) => item.trim()).filter(Boolean);
    }

    return [];
  }

  if (field === "is_active") {
    if (value === true || value === "true" || value === 1 || value === "1") {
      return true;
    }

    if (value === false || value === "false" || value === 0 || value === "0") {
      return false;
    }

    throw new Error("قيمة حالة الطبيب غير صحيحة.");
  }

  if (["graduation_year", "years_experience", "sort_order"].includes(field)) {
    if (value === "" || value === null) {
      return null;
    }

    const number = Number(value);

    if (!Number.isInteger(number)) {
      throw new Error(`القيمة المدخلة للحقل ${field} غير صحيحة.`);
    }

    if (field === "graduation_year" && (number < 1900 || number > 2100)) {
      throw new Error("سنة التخرج يجب أن تكون بين 1900 و2100.");
    }

    if (field === "years_experience" && number < 0) {
      throw new Error("سنوات الخبرة لا يمكن أن تكون سالبة.");
    }

    return number;
  }

  if (value === null) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }

  return value;
}

function getDoctorInput(body, { partial = false } = {}) {
  const data = {};

  for (const field of fields) {
    if (Object.hasOwn(body, field)) {
      data[field] = normalizeValue(field, body[field]);
    }
  }

  if (!partial) {
    for (const field of requiredFields) {
      if (!data[field]) {
        throw new Error(`الحقل ${field} مطلوب.`);
      }
    }

    data.gender ??= null;
    data.image_url ??= null;
    data.bio ??= null;
    data.medical_school ??= null;
    data.degree ??= null;
    data.graduation_year ??= null;
    data.postgraduate_qualifications ??= null;
    data.residency_fellowship ??= null;
    data.board_certifications ??= null;
    data.subspecialty ??= null;
    data.years_experience ??= null;
    data.languages ??= [];
    data.clinic_affiliation ??= null;
    data.medical_license_number ??= null;
    data.is_active ??= true;
    data.sort_order ??= 0;
  }

  if (
    data.gender !== undefined &&
    data.gender !== null &&
    !["male", "female"].includes(data.gender)
  ) {
    throw new Error("الجنس يجب أن يكون male أو female.");
  }

  return data;
}

function sendError(res, error) {
  if (error instanceof multer.MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "حجم الصورة يجب ألا يتجاوز 5 ميجابايت."
        : "تعذر رفع الصورة.";

    return res.status(400).json({ error: message });
  }

  if (
    error.message?.includes("يسمح فقط") ||
    error.message?.includes("قيمة ") ||
    error.message?.includes("مطلوب") ||
    error.message?.includes("سنة التخرج") ||
    error.message?.includes("سنوات الخبرة") ||
    error.message?.includes("حالة الطبيب") ||
    error.message?.includes("الجنس")
  ) {
    return res.status(400).json({ error: error.message });
  }

  console.error("Doctors API error:", error);
  return res.status(500).json({ error: "حدث خطأ في الخادم." });
}

function mapSchedule(rows) {
  return rows.map((r) =>
    r.note
      ? r.note
      : { day: r.day_of_week, time: `${r.start_time} – ${r.end_time}` }
  );
}

// Public: active doctors and their schedules.
router.get("/", async (_req, res) => {
  try {
    const { rows: doctors } = await pool.query(
      `SELECT * FROM doctors
       WHERE is_active = TRUE
       ORDER BY sort_order ASC, id ASC`
    );

    const ids = doctors.map((doctor) => doctor.id);
    let scheduleRows = [];

    if (ids.length) {
      const { rows } = await pool.query(
        `SELECT * FROM doctor_schedule
         WHERE doctor_id = ANY($1)
         ORDER BY sort_order ASC, id ASC`,
        [ids]
      );

      scheduleRows = rows;
    }

    res.json(
      doctors.map((doctor) => ({
        id: doctor.id,
        name: doctor.name,
        title: doctor.title,
        specialty: doctor.specialty,
        initials: doctor.initials,
        gender: doctor.gender,
        image: doctor.image_url,
        image_url: doctor.image_url,
        bio: doctor.bio,
        medical_school: doctor.medical_school,
        degree: doctor.degree,
        graduation_year: doctor.graduation_year,
        postgraduate_qualifications: doctor.postgraduate_qualifications,
        residency_fellowship: doctor.residency_fellowship,
        board_certifications: doctor.board_certifications,
        subspecialty: doctor.subspecialty,
        years_experience: doctor.years_experience,
        languages: doctor.languages,
        clinic_affiliation: doctor.clinic_affiliation,
        is_active: doctor.is_active,
        sort_order: doctor.sort_order,
        schedule: mapSchedule(
          scheduleRows.filter(
            (row) => String(row.doctor_id) === String(doctor.id)
          )
        ),
      }))
    );
  } catch (error) {
    sendError(res, error);
  }
});

// Admin: all doctors, including hidden doctors.
// Never return medical_license_number in the list.
router.get("/admin", requireAuth, requireRole("admin"), async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, user_id, name, title, specialty, initials, gender,
              image_url, bio, medical_school, degree, graduation_year,
              postgraduate_qualifications, residency_fellowship,
              board_certifications, subspecialty, years_experience,
              languages, clinic_affiliation, is_active, sort_order,
              created_at, updated_at
       FROM doctors
       ORDER BY sort_order ASC, id ASC`
    );

    res.json(rows);
  } catch (error) {
    sendError(res, error);
  }
});

// Upload a doctor photo.
// Frontend: POST /api/doctors/upload-image
// Multipart field name: image
router.post(
  "/upload-image",
  requireAuth,
  requireRole("admin"),
  (req, res, next) => {
    imageUpload.single("image")(req, res, (error) => {
      if (error) return sendError(res, error);
      next();
    });
  },
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "يرجى اختيار صورة." });
    }

    const image_url = `/uploads/doctors/${req.file.filename}`;

    res.status(201).json({ image_url });
  }
);

// Create doctor.
router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const data = getDoctorInput(req.body);
    const columns = Object.keys(data);
    const values = columns.map((column) => data[column]);
    const placeholders = columns.map((_, index) => `$${index + 1}`);

    const { rows } = await pool.query(
      `INSERT INTO doctors (${columns.join(", ")})
       VALUES (${placeholders.join(", ")})
       RETURNING *`,
      values
    );

    // The medical license number is only returned to authorized admins.
    res.status(201).json(rows[0]);
  } catch (error) {
    sendError(res, error);
  }
});

// Update only the fields supplied by the frontend.
router.put("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const data = getDoctorInput(req.body, { partial: true });
    const columns = Object.keys(data);

    if (!columns.length) {
      return res.status(400).json({ error: "لا توجد بيانات لتحديثها." });
    }

    const values = columns.map((column) => data[column]);
    const assignments = columns.map(
      (column, index) => `${column} = $${index + 1}`
    );

    values.push(req.params.id);

    const { rows } = await pool.query(
      `UPDATE doctors
       SET ${assignments.join(", ")}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );

    if (!rows[0]) {
      return res.status(404).json({ error: "الطبيب غير موجود." });
    }

    res.json(rows[0]);
  } catch (error) {
    sendError(res, error);
  }
});

router.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      "DELETE FROM doctors WHERE id = $1",
      [req.params.id]
    );

    if (!rowCount) {
      return res.status(404).json({ error: "الطبيب غير موجود." });
    }

    res.status(204).end();
  } catch (error) {
    sendError(res, error);
  }
});

export default router;
