import { Router } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, requireRole("super_admin"), async (req, res) => {
  const { rows } = await pool.query(
    "select id, full_name, email, role, job_title, is_active, created_at from users order by created_at asc"
  );
  res.json(rows);
});

// إضافة موظف جديد — يُنشئ الحساب وكلمة المرور مباشرة (بدل بريد دعوة)
router.post("/", requireAuth, requireRole("super_admin"), async (req, res) => {
  const { full_name, email, password, role, job_title } = req.body;
  if (!full_name || !email || !password) {
    return res.status(400).json({ error: "الاسم والبريد وكلمة المرور مطلوبة." });
  }

  const existing = await pool.query("select id from users where email = $1", [
    email.toLowerCase().trim(),
  ]);
  if (existing.rows.length) {
    return res.status(409).json({ error: "هذا البريد الإلكتروني مستخدم بالفعل." });
  }

  const password_hash = await bcrypt.hash(password, 12);
  const { rows } = await pool.query(
    `insert into users (full_name, email, password_hash, role, job_title)
     values ($1,$2,$3,$4,$5)
     returning id, full_name, email, role, job_title, is_active, created_at`,
    [full_name, email.toLowerCase().trim(), password_hash, role || "staff", job_title || null]
  );
  res.status(201).json(rows[0]);
});

router.put("/:id", requireAuth, requireRole("super_admin"), async (req, res) => {
  const { role, job_title, is_active, full_name } = req.body;

  if (req.params.id === req.user.id && (role !== undefined || is_active !== undefined)) {
    return res.status(400).json({ error: "لا يمكنك تعديل دورك أو حالتك الخاصة." });
  }

  const updates = [];
  const values = [];
  const set = (field, value) => {
    updates.push(`${field} = $${values.length + 1}`);
    values.push(value);
  };
  if (role !== undefined) set("role", role);
  if (job_title !== undefined) set("job_title", job_title);
  if (is_active !== undefined) set("is_active", is_active);
  if (full_name !== undefined) set("full_name", full_name);

  if (!updates.length) return res.status(400).json({ error: "لا توجد بيانات للتحديث." });
  values.push(req.params.id);

  const { rows } = await pool.query(
    `update users set ${updates.join(", ")} where id = $${values.length}
     returning id, full_name, email, role, job_title, is_active, created_at`,
    values
  );
  if (!rows[0]) return res.status(404).json({ error: "المستخدم غير موجود." });
  res.json(rows[0]);
});

// إعادة تعيين كلمة مرور موظف (بدون معرفة القديمة) — للمدير العام فقط
router.put("/:id/password", requireAuth, requireRole("super_admin"), async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 8) {
    return res.status(400).json({ error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل." });
  }
  const password_hash = await bcrypt.hash(password, 12);
  await pool.query("update users set password_hash = $1 where id = $2", [
    password_hash,
    req.params.id,
  ]);
  res.json({ ok: true });
});

export default router;
