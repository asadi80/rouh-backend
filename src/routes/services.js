import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/", async (req, res) => {
  const { rows } = await pool.query("select * from services order by sort_order asc, id asc");
  res.json(rows);
});

router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  const { icon, title, description } = req.body;
  const { rows } = await pool.query(
    "insert into services (icon, title, description) values ($1,$2,$3) returning *",
    [icon, title, description]
  );
  res.status(201).json(rows[0]);
});

router.put("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const { icon, title, description } = req.body;
  const { rows } = await pool.query(
    "update services set icon=$1, title=$2, description=$3 where id=$4 returning *",
    [icon, title, description, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: "الخدمة غير موجودة." });
  res.json(rows[0]);
});

router.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  await pool.query("delete from services where id = $1", [req.params.id]);
  res.status(204).end();
});

export default router;
