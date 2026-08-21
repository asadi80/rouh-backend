import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, requireRole("super_admin"), async (req, res) => {
  try {
    const { rows } = await pool.query(
      "select id, full_name, email, role, job_title, is_active, created_at from users order by created_at asc",
    );

    res.json(rows);
  } catch (err) {
    console.error("GET /api/staff error:", err);
    res.status(500).json({ error: "خطأ في السيرفر." });
  }
});

router.post("/", requireAuth, requireRole("super_admin"), async (req, res) => {
  try {
    const { full_name, email, password, role, job_title } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({
        error: "الاسم والبريد وكلمة المرور مطلوبة.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل.",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await pool.query("select id from users where email = $1", [
      normalizedEmail,
    ]);

    if (existing.rows.length) {
      return res.status(409).json({
        error: "هذا البريد الإلكتروني مستخدم بالفعل.",
      });
    }

    const id = crypto.randomUUID();
    const password_hash = await bcrypt.hash(password, 12);

    const { rows } = await pool.query(
      `insert into users
    (id, full_name, email, password_hash, role, job_title, must_change_password)
   values
    ($1, $2, $3, $4, $5, $6, true)
   returning id, full_name, email, role, job_title, is_active,
             must_change_password, created_at`,
      [
        id,
        full_name.trim(),
        normalizedEmail,
        password_hash,
        role || "staff",
        job_title || null,
      ],
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("POST /api/staff error:", err);

    if (err.code === "23505") {
      return res.status(409).json({
        error: "هذا البريد الإلكتروني مستخدم بالفعل.",
      });
    }

    res.status(500).json({
      error: "خطأ في السيرفر.",
    });
  }
});

router.put(
  "/:id",
  requireAuth,
  requireRole("super_admin"),
  async (req, res) => {
    try {
      const { role, job_title, is_active, full_name } = req.body;

      if (
        req.params.id === req.user.id &&
        (role !== undefined || is_active !== undefined)
      ) {
        return res.status(400).json({
          error: "لا يمكنك تعديل دورك أو حالتك الخاصة.",
        });
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

      if (!updates.length) {
        return res.status(400).json({
          error: "لا توجد بيانات للتحديث.",
        });
      }

      values.push(req.params.id);

      const { rows } = await pool.query(
        `update users
       set ${updates.join(", ")}
       where id = $${values.length}
       returning id, full_name, email, role, job_title, is_active, created_at`,
        values,
      );

      if (!rows[0]) {
        return res.status(404).json({
          error: "المستخدم غير موجود.",
        });
      }

      res.json(rows[0]);
    } catch (err) {
      console.error("PUT /api/staff/:id error:", err);
      res.status(500).json({
        error: "خطأ في السيرفر.",
      });
    }
  },
);

router.put(
  "/:id/password",
  requireAuth,
  requireRole("super_admin"),
  async (req, res) => {
    try {
      const { password } = req.body;

      if (!password || password.length < 8) {
        return res.status(400).json({
          error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل.",
        });
      }

      const password_hash = await bcrypt.hash(password, 12);

      const result = await pool.query(
        "update users set password_hash = $1 where id = $2",
        [password_hash, req.params.id],
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          error: "المستخدم غير موجود.",
        });
      }

      res.json({ ok: true });
    } catch (err) {
      console.error("PUT /api/staff/:id/password error:", err);
      res.status(500).json({
        error: "خطأ في السيرفر.",
      });
    }
  },
);

export default router;
