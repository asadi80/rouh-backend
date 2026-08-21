import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, requireRole("admin"), async (req, res) => {
  const search = req.query.q?.trim();
  if (search) {
    const { rows } = await pool.query(
      `select p.*, d.name as preferred_doctor_name
       from patients p
       left join doctors d on d.id = p.preferred_doctor_id
       where p.full_name ilike $1 or p.phone ilike $1
       order by p.created_at desc`,
      [`%${search}%`]
    );
    return res.json(rows);
  }
  const { rows } = await pool.query(
    `select p.*, d.name as preferred_doctor_name
     from patients p
     left join doctors d on d.id = p.preferred_doctor_id
     order by p.created_at desc`
  );
  res.json(rows);
});

router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  const { full_name, phone, email, notes, preferred_doctor_id } = req.body;
  if (!full_name || !phone) {
    return res.status(400).json({ error: "الاسم والهاتف مطلوبان." });
  }
  const { rows } = await pool.query(
    `insert into patients (full_name, phone, email, notes, preferred_doctor_id)
     values ($1,$2,$3,$4,$5) returning *`,
    [full_name, phone, email || null, notes || null, preferred_doctor_id || null]
  );
  res.status(201).json(rows[0]);
});

router.put("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const { full_name, phone, email, notes, preferred_doctor_id } = req.body;
  const { rows } = await pool.query(
    `update patients set full_name=$1, phone=$2, email=$3, notes=$4, preferred_doctor_id=$5
     where id=$6 returning *`,
    [full_name, phone, email || null, notes || null, preferred_doctor_id || null, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: "المريض غير موجود." });
  res.json(rows[0]);
});

router.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  await pool.query("delete from patients where id = $1", [req.params.id]);
  res.status(204).end();
});

export default router;
