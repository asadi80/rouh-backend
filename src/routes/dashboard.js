import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/summary", requireAuth, requireRole("admin"), async (req, res) => {
  const [doctors, staff, requests, recent] = await Promise.all([
    pool.query("select count(*)::int as count from doctors"),
    pool.query("select count(*)::int as count from users"),
    pool.query("select count(*)::int as count from appointment_requests where status = 'new'"),
    pool.query(
      "select * from appointment_requests order by created_at desc limit 5"
    ),
  ]);

  res.json({
    doctors: doctors.rows[0].count,
    staff: staff.rows[0].count,
    requests: requests.rows[0].count,
    recentRequests: recent.rows,
  });
});

export default router;
