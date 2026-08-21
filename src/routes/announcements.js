import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// عام: الإعلانات المفعّلة فقط — يستخدمه الموقع العام
// إن لم يوجد أي إعلان مفعّل، يعيد مصفوفة فارغة (الموقع لا يعرض شيئًا حينها)
router.get("/", async (req, res) => {
  const { rows } = await pool.query(
    "select id, title, message from announcements where is_active = true order by sort_order asc, id desc"
  );
  res.json(rows);
});

// لوحة التحكم: كل الإعلانات (مفعّلة ومخفية)
router.get("/admin", requireAuth, requireRole("admin"), async (req, res) => {
  const { rows } = await pool.query(
    "select * from announcements order by sort_order asc, id desc"
  );
  res.json(rows);
});

router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  const { title, message, is_active } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: "نص الإعلان مطلوب." });
  }
  const { rows } = await pool.query(
    "insert into announcements (title, message, is_active) values ($1,$2,$3) returning *",
    [title || null, message.trim(), is_active ?? true]
  );
  res.status(201).json(rows[0]);
});

router.put("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const { title, message, is_active } = req.body;
  const { rows } = await pool.query(
    "update announcements set title=$1, message=$2, is_active=$3 where id=$4 returning *",
    [title || null, message, is_active, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: "الإعلان غير موجود." });
  res.json(rows[0]);
});

router.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  await pool.query("delete from announcements where id = $1", [req.params.id]);
  res.status(204).end();
});

export default router;
