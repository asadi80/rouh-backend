-- ============================================================
-- مصحة روح — قاعدة بيانات PostgreSQL (يديرها سيرفر Node.js)
-- شغّل هذا الملف على أي قاعدة Postgres (محلية، أو Supabase/Railway/Render
-- تستخدمها فقط كمخزن بيانات — بدون استخدام Supabase Auth أو RLS، لأن كل
-- منطق الدخول والصلاحيات أصبح في سيرفر Node.js).
--
-- التشغيل:  psql "postgres://user:pass@host:port/dbname" -f schema.sql
-- ============================================================

create extension if not exists "pgcrypto"; -- لتوليد UUID

create type employee_role as enum ('super_admin', 'admin', 'doctor', 'staff');

-- ------------------------------------------------------------
-- المسميات الوظيفية المتاحة للاختيار من لوحة التحكم
-- ------------------------------------------------------------
create table job_titles (
  id bigserial primary key,
  title_ar text not null unique
);

insert into job_titles (title_ar) values
  ('طبيب نفسي'),
  ('طبيبة نفسية'),
  ('طبيب نفسي وعلاج إدمان'),
  ('استشاري الطب النفسي وعلاج الإدمان'),
  ('استشاري العلاج النفسي وعلاج الإدمان'),
  ('استشارية الطب النفسي'),
  ('استشاري الطب النفسي للأطفال والمراهقين'),
  ('أخصائي علاج نفسي'),
  ('أخصائية علاج نفسي'),
  ('أخصائية الطب النفسي'),
  ('أخصائية العلاج النفسي المعرفي السلوكي'),
  ('موظف استقبال'),
  ('مدير العيادة');

-- ------------------------------------------------------------
-- المستخدمون (موظفو لوحة التحكم) — كلمة المرور مخزّنة كـ bcrypt hash
-- ------------------------------------------------------------
create table users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  password_hash text not null,
  role employee_role not null default 'staff',
  job_title text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- الأطباء
-- ------------------------------------------------------------
create table doctors (
  id bigserial primary key,
  user_id uuid references users (id) on delete set null, -- اختياري: ربط بحساب دخول
  name text not null,
  title text not null,
  specialty text not null,
  initials text not null,
  image_url text,
  bio text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table doctor_schedule (
  id bigserial primary key,
  doctor_id bigint not null references doctors (id) on delete cascade,
  day_of_week text,
  start_time text,
  end_time text,
  note text,
  sort_order int not null default 0
);

-- ------------------------------------------------------------
-- الخدمات ولماذا نحن
-- ------------------------------------------------------------
create table services (
  id bigserial primary key,
  icon text not null,
  title text not null,
  description text not null,
  sort_order int not null default 0
);

create table why_us (
  id bigserial primary key,
  icon text not null,
  title text not null,
  description text not null,
  sort_order int not null default 0
);

-- ------------------------------------------------------------
-- أوقات العمل
-- ------------------------------------------------------------
create table working_hours (
  id bigserial primary key,
  day_of_week text not null unique,
  hours_text text not null,
  is_open boolean not null default true,
  sort_order int not null default 0
);

-- ------------------------------------------------------------
-- إعدادات العيادة (صف واحد)
-- ------------------------------------------------------------
create table clinic_settings (
  id int primary key default 1,
  name text not null,
  short_name text not null,
  tagline text,
  description text,
  phone text,
  phone_display text,
  whatsapp text,
  email text,
  address text,
  google_maps_url text,
  google_maps_embed_url text,
  instagram_url text,
  whatsapp_url text,
  twitter_url text,
  facebook_url text,
  tiktok_url text,
  snapchat_url text,
  constraint single_row check (id = 1)
);

insert into clinic_settings (id, name, short_name)
values (1, 'مصحة روح للطب النفسي', 'مصحة روح');

-- ------------------------------------------------------------
-- طلبات حجز واردة من الموقع العام
-- ------------------------------------------------------------
create table appointment_requests (
  id bigserial primary key,
  doctor_id bigint references doctors (id) on delete set null,
  patient_name text not null,
  patient_phone text not null,
  preferred_day text,
  notes text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- المرضى (سجل بسيط يديره الموظفون من لوحة التحكم)
-- ------------------------------------------------------------
create table patients (
  id bigserial primary key,
  full_name text not null,
  phone text not null,
  email text,
  notes text,
  preferred_doctor_id bigint references doctors (id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_patients_phone on patients (phone);

-- ------------------------------------------------------------
-- الإعلانات (تظهر في الموقع العام فقط إذا كانت مفعّلة)
-- ------------------------------------------------------------
create table announcements (
  id bigserial primary key,
  title text,
  message text not null,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================
-- ملاحظة: أنشئ أول حساب super_admin عبر سكربت السيرفر:
--   npm run create-admin -- --email you@rouh.ly --password "..." --name "اسمك"
-- (راجع server/README.md)
-- ============================================================
