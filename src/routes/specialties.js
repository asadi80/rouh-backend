import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// GET all specialties (including inactive ones) with doctor count
router.get("/", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        s.id,
        s.name,
        s.description,
        s.is_active,
        s.sort_order,
        s.created_at,
        s.updated_at,
        COUNT(ds.doctor_id)::INTEGER AS doctor_count
      FROM specialties s
      LEFT JOIN doctor_specialties ds
        ON ds.specialty_id = s.id
      GROUP BY s.id
      ORDER BY s.sort_order ASC, s.name ASC
    `);

    res.json(rows);
  } catch (err) {
    console.error("GET specialties error:", err);
    res.status(500).json({ error: "حدث خطأ أثناء جلب التخصصات." });
  }
});

// POST create specialty
router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  const { name, description = "", sort_order = 0 } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "اسم التخصص مطلوب." });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO specialties (name, description, sort_order)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name.trim(), description?.trim() || null, Number(sort_order) || 0],
    );

    res.status(201).json({
      ...rows[0],
      doctor_count: 0,
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "هذا التخصص موجود بالفعل." });
    }

    console.error("POST specialty error:", err);
    res.status(500).json({ error: "حدث خطأ أثناء إضافة التخصص." });
  }
});

// PUT update specialty
router.put("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const { name, description, is_active, sort_order } = req.body;

  if (name !== undefined && (typeof name !== "string" || !name.trim())) {
    return res.status(400).json({
      error: "اسم التخصص مطلوب.",
    });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE specialties
       SET
         name = COALESCE($1, name),
         description = COALESCE($2, description),
         is_active = COALESCE($3, is_active),
         sort_order = COALESCE($4, sort_order),
         updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [
        name !== undefined ? name.trim() : null,
        description !== undefined ? description.trim() || null : null,
        is_active !== undefined ? is_active : null,
        sort_order !== undefined ? Number(sort_order) : null,
        req.params.id,
      ],
    );

    if (!rows[0]) {
      return res.status(404).json({ error: "التخصص غير موجود." });
    }

    res.json(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "هذا التخصص موجود بالفعل." });
    }

    console.error("PUT specialty error:", err);
    res.status(500).json({ error: "حدث خطأ أثناء تحديث التخصص." });
  }
});

// DELETE specialty
router.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Check whether any doctors are assigned to this specialty
    const { rows: assigned } = await client.query(
      `SELECT COUNT(*)::INTEGER AS doctor_count
       FROM doctor_specialties
       WHERE specialty_id = $1`,
      [req.params.id],
    );

    if (assigned[0].doctor_count > 0) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        error: "لا يمكن حذف هذا التخصص لأنه مرتبط بأطباء.",
        doctor_count: assigned[0].doctor_count,
      });
    }

    const { rows } = await client.query(
      "DELETE FROM specialties WHERE id = $1 RETURNING id",
      [req.params.id],
    );

    if (!rows[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "التخصص غير موجود." });
    }

    await client.query("COMMIT");
    res.status(204).end();
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("DELETE specialty error:", err);
    res.status(500).json({ error: "حدث خطأ أثناء حذف التخصص." });
  } finally {
    client.release();
  }
});

export default router;
