import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

function mapSchedule(rows) {
  return rows.map((r) =>
    r.note
      ? r.note
      : { day: r.day_of_week, time: `${r.start_time} – ${r.end_time}` }
  );
}

// عام: قائمة الأطباء النشطين مع جداولهم (يستخدمه الموقع العام)
router.get("/", async (req, res) => {
  const { rows: doctors } = await pool.query(
    "select * from doctors where is_active = true order by sort_order asc, id asc"
  );
  const ids = doctors.map((d) => d.id);
  let scheduleRows = [];
  if (ids.length) {
    const { rows } = await pool.query(
      "select * from doctor_schedule where doctor_id = any($1) order by sort_order asc, id asc",
      [ids]
    );
    scheduleRows = rows;
  }

  const result = doctors.map((d) => ({
    id: d.id,
    name: d.name,
    title: d.title,
    specialty: d.specialty,
    initials: d.initials,
    image: d.image_url,
    bio: d.bio,
    is_active: d.is_active,
    schedule: mapSchedule(scheduleRows.filter((s) => s.doctor_id === d.id)),
  }));

  res.json(result);
});

// لوحة التحكم: كل الأطباء (نشط/مخفي) — يتطلب دخول admin فما فوق
router.get("/admin", requireAuth, requireRole("admin"), async (req, res) => {
  const { rows } = await pool.query("select * from doctors order by sort_order asc, id asc");
  res.json(rows);
});

router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  const { name, title, specialty, initials, image_url, bio, is_active } = req.body;
  const { rows } = await pool.query(
    `insert into doctors (name, title, specialty, initials, image_url, bio, is_active)
     values ($1,$2,$3,$4,$5,$6,$7) returning *`,
    [name, title, specialty, initials, image_url || null, bio || null, is_active ?? true]
  );
  res.status(201).json(rows[0]);
});

router.put("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const { name, title, specialty, initials, image_url, bio, is_active } = req.body;
  const { rows } = await pool.query(
    `update doctors set name=$1, title=$2, specialty=$3, initials=$4,
     image_url=$5, bio=$6, is_active=$7 where id=$8 returning *`,
    [name, title, specialty, initials, image_url || null, bio || null, is_active ?? true, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: "الطبيب غير موجود." });
  res.json(rows[0]);
});

router.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  await pool.query("delete from doctors where id = $1", [req.params.id]);
  res.status(204).end();
});

export default router;
