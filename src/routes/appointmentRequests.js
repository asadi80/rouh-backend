import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// عام: استقبال طلب حجز من الموقع
router.post("/", async (req, res) => {
  const { doctor_id, patient_name, patient_phone, preferred_day, notes } = req.body;
  if (!patient_name || !patient_phone) {
    return res.status(400).json({ error: "الاسم والهاتف مطلوبان." });
  }
  const { rows } = await pool.query(
    `insert into appointment_requests (doctor_id, patient_name, patient_phone, preferred_day, notes)
     values ($1,$2,$3,$4,$5) returning *`,
    [doctor_id || null, patient_name, patient_phone, preferred_day || null, notes || null]
  );
  res.status(201).json(rows[0]);
});

router.get("/", requireAuth, requireRole("admin"), async (req, res) => {
  const { rows } = await pool.query(
    "select * from appointment_requests order by created_at desc limit 100"
  );
  res.json(rows);
});

router.put("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const { status } = req.body;
  const { rows } = await pool.query(
    "update appointment_requests set status=$1 where id=$2 returning *",
    [status, req.params.id]
  );
  res.json(rows[0]);
});

export default router;
