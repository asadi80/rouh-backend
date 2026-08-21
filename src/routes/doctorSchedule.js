import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// كل مواعيد طبيب معيّن
router.get("/:doctorId/schedule", requireAuth, requireRole("admin"), async (req, res) => {
  const { rows } = await pool.query(
    "select * from doctor_schedule where doctor_id = $1 order by sort_order asc, id asc",
    [req.params.doctorId]
  );
  res.json(rows);
});

// إضافة موعد جديد للطبيب
// يقبل إما { day_of_week, start_time, end_time } أو { note } (لحالات مثل "الحجز أونلاين")
router.post("/:doctorId/schedule", requireAuth, requireRole("admin"), async (req, res) => {
  const { day_of_week, start_time, end_time, note } = req.body;

  if (!note && (!day_of_week || !start_time || !end_time)) {
    return res
      .status(400)
      .json({ error: "أدخل اليوم والوقتين، أو نص بديل (مثل: الحجز أونلاين فقط)." });
  }

  const { rows } = await pool.query(
    `insert into doctor_schedule (doctor_id, day_of_week, start_time, end_time, note)
     values ($1,$2,$3,$4,$5) returning *`,
    [
      req.params.doctorId,
      note ? null : day_of_week,
      note ? null : start_time,
      note ? null : end_time,
      note || null,
    ]
  );
  res.status(201).json(rows[0]);
});

router.put("/:doctorId/schedule/:entryId", requireAuth, requireRole("admin"), async (req, res) => {
  const { day_of_week, start_time, end_time, note } = req.body;
  const { rows } = await pool.query(
    `update doctor_schedule set day_of_week=$1, start_time=$2, end_time=$3, note=$4
     where id=$5 and doctor_id=$6 returning *`,
    [
      note ? null : day_of_week,
      note ? null : start_time,
      note ? null : end_time,
      note || null,
      req.params.entryId,
      req.params.doctorId,
    ]
  );
  if (!rows[0]) return res.status(404).json({ error: "الموعد غير موجود." });
  res.json(rows[0]);
});

router.delete("/:doctorId/schedule/:entryId", requireAuth, requireRole("admin"), async (req, res) => {
  await pool.query("delete from doctor_schedule where id = $1 and doctor_id = $2", [
    req.params.entryId,
    req.params.doctorId,
  ]);
  res.status(204).end();
});

export default router;
