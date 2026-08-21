// إنشاء أول حساب مدير عام (super_admin)
// الاستخدام: node src/scripts/createAdmin.js --email you@rouh.ly --password "..." --name "اسمك"
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
    console.error("الاستخدام: node src/scripts/createAdmin.js --email you@rouh.ly --password \"...\" --name \"اسمك\"");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("كلمة المرور يجب أن تكون 8 أحرف على الأقل.");
    process.exit(1);
  }

  const password_hash = await bcrypt.hash(password, 12);

  const existing = await pool.query("select id from users where email = $1", [email.toLowerCase()]);
  if (existing.rows.length) {
    await pool.query(
      "update users set password_hash=$1, role='super_admin', full_name=$2, is_active=true where email=$3",
      [password_hash, name, email.toLowerCase()]
    );
    console.log(`تم تحديث الحساب الموجود ورفعه إلى super_admin: ${email}`);
  } else {
    await pool.query(
      "insert into users (full_name, email, password_hash, role) values ($1,$2,$3,'super_admin')",
      [name, email.toLowerCase(), password_hash]
    );
    console.log(`تم إنشاء حساب super_admin جديد: ${email}`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
