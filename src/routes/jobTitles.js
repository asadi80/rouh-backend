import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, requireRole("admin"), async (req, res) => {
  const { rows } = await pool.query("select * from job_titles order by title_ar asc");
  res.json(rows);
});

router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  const { title_ar } = req.body;
  if (!title_ar || !title_ar.trim()) {
    return res.status(400).json({ error: "المسمى الوظيفي مطلوب." });
  }
  try {
    const { rows } = await pool.query(
      "insert into job_titles (title_ar) values ($1) returning *",
      [title_ar.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "هذا المسمى موجود بالفعل." });
    }
    throw err;
  }
});

router.put("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const { title_ar } = req.body;
  if (!title_ar || !title_ar.trim()) {
    return res.status(400).json({ error: "المسمى الوظيفي مطلوب." });
  }
  try {
    const { rows } = await pool.query(
      "update job_titles set title_ar = $1 where id = $2 returning *",
      [title_ar.trim(), req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "غير موجود." });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "هذا المسمى موجود بالفعل." });
    }
    throw err;
  }
});

router.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  await pool.query("delete from job_titles where id = $1", [req.params.id]);
  res.status(204).end();
});

export default router;
