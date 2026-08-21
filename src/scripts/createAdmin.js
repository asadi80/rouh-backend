
// إنشاء أول حساب مدير عام (super_admin)
// الاستخدام:
// npm run create-admin -- --email you@rouh.ly --password "..." --name "اسمك"

import crypto from "crypto";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { pool } from "../db.js";

dotenv.config();

function getArg(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : null;
}

async function main() {
  const email = getArg("--email");
  const password = getArg("--password");
  const name = getArg("--name") || "مدير النظام";

  if (!email || !password) {
    console.error(
      'الاستخدام: npm run create-admin -- --email you@rouh.ly --password "..." --name "اسمك"'
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("كلمة المرور يجب أن تكون 8 أحرف على الأقل.");
    process.exit(1);
  }

  const normalizedEmail = email.toLowerCase();
  const password_hash = await bcrypt.hash(password, 12);

  const existing = await pool.query(
    "SELECT id FROM users WHERE email = $1",
    [normalizedEmail]
  );

  if (existing.rows.length) {
    await pool.query(
      `UPDATE users
       SET password_hash = $1,
           role = 'super_admin',
           full_name = $2,
           is_active = true
       WHERE email = $3`,
      [password_hash, name, normalizedEmail]
    );

    console.log(
      `تم تحديث الحساب الموجود ورفعه إلى super_admin: ${normalizedEmail}`
    );
  } else {
    // PostgreSQL on this server does not have pgcrypto,
    // so generate the UUID in Node.js.
    const id = crypto.randomUUID();

    await pool.query(
      `INSERT INTO users
       (id, full_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, 'super_admin')`,
      [id, name, normalizedEmail, password_hash]
    );

    console.log(
      `تم إنشاء حساب super_admin جديد: ${normalizedEmail}`
    );
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

