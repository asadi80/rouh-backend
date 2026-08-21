import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

const EDITABLE_FIELDS = [
  "name",
  "short_name",
  "tagline",
  "description",
  "phone",
  "email",
  "address",
  "google_maps_url",
  "google_maps_embed_url",
  "instagram_url",
  "whatsapp_url",
  "twitter_url",
  "facebook_url",
  "tiktok_url",
  "snapchat_url",
];

router.get("/", async (req, res) => {
  const { rows } = await pool.query("select * from clinic_settings where id = 1");
  res.json(rows[0]);
});

router.put("/", requireAuth, requireRole("admin"), async (req, res) => {
  const updates = [];
  const values = [];
  EDITABLE_FIELDS.forEach((field, i) => {
    if (field in req.body) {
      updates.push(`${field} = $${values.length + 1}`);
      values.push(req.body[field]);
    }
  });

  if (!updates.length) return res.status(400).json({ error: "لا توجد بيانات للتحديث." });

  const { rows } = await pool.query(
    `update clinic_settings set ${updates.join(", ")} where id = 1 returning *`,
    values
  );
  res.json(rows[0]);
});

export default router;
