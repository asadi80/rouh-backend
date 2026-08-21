import { verifyToken } from "../utils/jwt.js";
import { pool } from "../db.js";

// يتحقق من التوكن، ويحمّل بيانات المستخدم الحالية (لضمان أن الحساب لا يزال مفعّلًا)
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "الرجاء تسجيل الدخول." });
  }

  try {
    const payload = verifyToken(token);
    const { rows } = await pool.query(
      "select id, full_name, email, role, job_title, is_active from users where id = $1",
      [payload.sub]
    );
    const user = rows[0];

    if (!user || !user.is_active) {
      return res.status(401).json({ error: "الحساب غير موجود أو موقوف." });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "جلسة الدخول غير صالحة، سجّل الدخول مجددًا." });
  }
}

// requireRole("admin") يسمح لـ admin و super_admin
// requireRole("super_admin") يسمح فقط لـ super_admin
export function requireRole(minRole) {
  return (req, res, next) => {
    const role = req.user?.role;
    const allowed =
      minRole === "super_admin" ? role === "super_admin" : role === "admin" || role === "super_admin";

    if (!allowed) {
      return res.status(403).json({ error: "لا تملك صلاحية الوصول لهذا الإجراء." });
    }
    next();
  };
}
