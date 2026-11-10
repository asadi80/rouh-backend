import { Router } from "express";
import { open } from "node:fs/promises";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const LOG_FILE = "/home/rouhly/api/passenger.log";
const MAX_READ_BYTES = 2 * 1024 * 1024;
const MAX_LINES = 1000;

// Only administrators can access server logs.
function requireAdmin(req, res, next) {
  const role = req.user?.role;

  if (!["admin", "super_admin"].includes(role)) {
    return res.status(403).json({
      error: "You are not authorized to view server logs.",
    });
  }

  next();
}

// Hide credentials and sensitive values before returning logs.
function sanitizeLog(line) {
  return line
    .replace(
      /(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi,
      "$1[REDACTED]"
    )
    .replace(
      /("(?:password|password_hash|token|accessToken|refreshToken|secret|authorization|DATABASE_URL)"\s*:\s*")[^"]*(")/gi,
      "$1[REDACTED]$2"
    )
    .replace(
      /(postgres(?:ql)?:\/\/)[^@\s]+@/gi,
      "$1[REDACTED]@"
    )
    .replace(
      /((?:password|token|secret|authorization)\s*[=:]\s*)\S+/gi,
      "$1[REDACTED]"
    );
}

// GET /api/admin/logs
router.get("/", requireAuth, requireAdmin, async (req, res) => {
  let file;

  try {
    const requestedLimit = Number.parseInt(req.query.limit, 10) || 300;
    const limit = Math.min(Math.max(requestedLimit, 1), MAX_LINES);

    const search = String(req.query.search || "")
      .trim()
      .slice(0, 200)
      .toLowerCase();

    const level = String(req.query.level || "all").toLowerCase();

    file = await open(LOG_FILE, "r");

    const stats = await file.stat();

    if (!stats.isFile()) {
      return res.status(404).json({
        error: "Log file not found.",
      });
    }

    const bytesToRead = Math.min(stats.size, MAX_READ_BYTES);
    const startPosition = Math.max(0, stats.size - bytesToRead);

    const buffer = Buffer.alloc(bytesToRead);

    await file.read(
      buffer,
      0,
      bytesToRead,
      startPosition
    );

    let content = buffer.toString("utf8");

    // The first line may be incomplete when reading from the end.
    if (startPosition > 0) {
      const firstNewline = content.indexOf("\n");

      content = firstNewline === -1
        ? ""
        : content.slice(firstNewline + 1);
    }

    let logs = content
      .split(/\r?\n/)
      .filter(Boolean)
      .map(sanitizeLog);

    if (search) {
      logs = logs.filter((line) =>
        line.toLowerCase().includes(search)
      );
    }

    if (level !== "all") {
      logs = logs.filter((line) => {
        const text = line.toLowerCase();

        if (level === "error") {
          return (
            text.includes("error") ||
            text.includes("failed") ||
            text.includes("🔴") ||
            text.includes("exception")
          );
        }

        if (level === "warning") {
          return (
            text.includes("warning") ||
            text.includes("warn") ||
            text.includes("🟡") ||
            text.includes("⚠️")
          );
        }

        if (level === "info") {
          return (
            text.includes("info") ||
            text.includes("request") ||
            text.includes("response") ||
            text.includes("🟢")
          );
        }

        return true;
      });
    }

    // Return newest entries first.
    logs = logs.slice(-limit).reverse();

    return res.json({
      ok: true,
      logs,
      count: logs.length,
      fileSize: stats.size,
      truncated: stats.size > MAX_READ_BYTES,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[ADMIN LOGS ERROR]", error.message);

    return res.status(500).json({
      error: "Unable to read server logs.",
    });
  } finally {
    if (file) {
      await file.close().catch(() => {});
    }
  }
});

export default router;