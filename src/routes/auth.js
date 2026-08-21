import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { pool } from "../db.js";
import { signToken } from "../utils/jwt.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// يحدّ من محاولات تسجيل الدخول لمنع هجمات التخمين
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "محاولات كثيرة جدًا، حاول مرة أخرى بعد قليل." },
});


// ============================================================
// تسجيل الدخول
// ============================================================
router.post("/login", loginLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: "البريد الإلكتروني وكلمة المرور مطلوبان.",
    });
  }

  const { rows } = await pool.query(
    "select * from users where email = $1",
    [email.toLowerCase().trim()]
  );

  const user = rows[0];

  if (!user || !user.is_active) {
    return res.status(401).json({
      error: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
    });
  }

  const valid = await bcrypt.compare(password, user.password_hash);

  if (!valid) {
    return res.status(401).json({
      error: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
    });
  }

  const token = signToken(user);

  res.json({
    token,
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      job_title: user.job_title,
      must_change_password: user.must_change_password,
    },
  });
});


// ============================================================
// تغيير كلمة المرور
// ============================================================
router.post("/change-password", requireAuth, async (req, res) => {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({
      error: "كلمة المرور الحالية والجديدة مطلوبة.",
    });
  }

  if (new_password.length < 8) {
    return res.status(400).json({
      error: "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.",
    });
  }

  // جلب المستخدم الحالي من قاعدة البيانات
  const { rows } = await pool.query(
    `select id, password_hash
     from users
     where id = $1`,
    [req.user.id]
  );

  const user = rows[0];

  if (!user) {
    return res.status(404).json({
      error: "المستخدم غير موجود.",
    });
  }

  // التأكد من كلمة المرور الحالية
  const valid = await bcrypt.compare(
    current_password,
    user.password_hash
  );

  if (!valid) {
    return res.status(401).json({
      error: "كلمة المرور الحالية غير صحيحة.",
    });
  }

  // إنشاء hash جديد
  const password_hash = await bcrypt.hash(new_password, 12);

  // تحديث كلمة المرور وإلغاء إجبار التغيير
  await pool.query(
    `update users
     set password_hash = $1,
         must_change_password = false
     where id = $2`,
    [password_hash, user.id]
  );

  res.json({
    ok: true,
    message: "تم تغيير كلمة المرور بنجاح.",
  });
});


// ============================================================
// المستخدم الحالي
// ============================================================
router.get("/me", requireAuth, async (req, res) => {
  // نقرأ المستخدم من DB حتى تكون قيمة
  // must_change_password حديثة دائمًا
  const { rows } = await pool.query(
    `select id, full_name, email, role, job_title,
            is_active, must_change_password
     from users
     where id = $1`,
    [req.user.id]
  );

  const user = rows[0];

  if (!user || !user.is_active) {
    return res.status(401).json({
      error: "الحساب غير صالح.",
    });
  }

  res.json({ user });
});


export default router;