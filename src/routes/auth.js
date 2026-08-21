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

router.post("/login", loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "البريد الإلكتروني وكلمة المرور مطلوبان." });
  }

  const { rows } = await pool.query("select * from users where email = $1", [
    email.toLowerCase().trim(),
  ]);
  const user = rows[0];

  if (!user || !user.is_active) {
    return res.status(401).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة." });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة." });
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
    },
  });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
