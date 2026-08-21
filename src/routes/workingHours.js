import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// GET - Fetch all working hours
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM working_hours ORDER BY sort_order ASC, id ASC"
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching working hours:", error);
    res.status(500).json({ error: "تعذّر تحميل أوقات العمل." });
  }
});

// PUT - Save working hours (handles both update and insert)
router.put("/", requireAuth, requireRole("admin"), async (req, res) => {
  const rows = req.body.rows || [];
  
  if (!rows.length) {
    return res.status(400).json({ error: "لا توجد بيانات للحفظ." });
  }

  const client = await pool.connect();
  
  try {
    await client.query("BEGIN");

    for (const r of rows) {
      if (r.id) {
        // Update existing record
        await client.query(
          "UPDATE working_hours SET hours_text = $1, is_open = $2 WHERE id = $3",
          [r.hours_text || "", r.is_open, r.id]
        );
      } else {
        // Insert new record using day_of_week (unique constraint)
        // This handles the case when database is empty
        await client.query(
          `INSERT INTO working_hours (day_of_week, hours_text, is_open, sort_order) 
           VALUES ($1, $2, $3, $4) 
           ON CONFLICT (day_of_week) 
           DO UPDATE SET 
             hours_text = EXCLUDED.hours_text, 
             is_open = EXCLUDED.is_open`,
          [r.day_of_week, r.hours_text || "", r.is_open, getSortOrder(r.day_of_week)]
        );
      }
    }

    await client.query("COMMIT");

    // Fetch all updated records
    const { rows: updated } = await pool.query(
      "SELECT * FROM working_hours ORDER BY sort_order ASC, id ASC"
    );
    
    res.json(updated);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error saving working hours:", error);
    res.status(500).json({ 
      error: error.message || "تعذّر حفظ أوقات العمل." 
    });
  } finally {
    client.release();
  }
});

// Helper function to map Arabic days to sort order
function getSortOrder(day) {
  const orderMap = {
    'السبت': 1,
    'الأحد': 2,
    'الاثنين': 3,
    'الثلاثاء': 4,
    'الأربعاء': 5,
    'الخميس': 6,
    'الجمعة': 7
  };
  return orderMap[day] || 0;
}

export default router;