-- -- ============================================================
-- -- مصحة روح — قاعدة بيانات PostgreSQL (يديرها سيرفر Node.js)
-- -- شغّل هذا الملف على أي قاعدة Postgres (محلية، أو Supabase/Railway/Render
-- -- تستخدمها فقط كمخزن بيانات — بدون استخدام Supabase Auth أو RLS، لأن كل
-- -- منطق الدخول والصلاحيات أصبح في سيرفر Node.js).
-- --
-- -- التشغيل:  psql "postgres://user:pass@host:port/dbname" -f schema.sql
-- -- ============================================================

-- -- create extension if not exists "pgcrypto"; -- لتوليد UUID
-- -- pgcrypto is not available on this server
-- create type employee_role as enum ('super_admin', 'admin', 'doctor', 'staff');

-- -- ------------------------------------------------------------
-- -- المسميات الوظيفية المتاحة للاختيار من لوحة التحكم
-- -- ------------------------------------------------------------
-- create table job_titles (
--   id bigserial primary key,
--   title_ar text not null unique
-- );

-- insert into job_titles (title_ar) values
--   ('طبيب نفسي'),
--   ('طبيبة نفسية'),
--   ('طبيب نفسي وعلاج إدمان'),
--   ('استشاري الطب النفسي وعلاج الإدمان'),
--   ('استشاري العلاج النفسي وعلاج الإدمان'),
--   ('استشارية الطب النفسي'),
--   ('استشاري الطب النفسي للأطفال والمراهقين'),
--   ('أخصائي علاج نفسي'),
--   ('أخصائية علاج نفسي'),
--   ('أخصائية الطب النفسي'),
--   ('أخصائية العلاج النفسي المعرفي السلوكي'),
--   ('موظف استقبال'),
--   ('مدير العيادة');

-- -- ------------------------------------------------------------
-- -- المستخدمون (موظفو لوحة التحكم) — كلمة المرور مخزّنة كـ bcrypt hash
-- -- ------------------------------------------------------------
-- create table users (
--   id uuid primary key,
--   full_name text not null,
--   email text not null unique,
--   password_hash text not null,
--   role employee_role not null default 'staff',
--   job_title text,
--   is_active boolean not null default true,
--   must_change_password boolean NOT NULL DEFAULT false,
--   created_at timestamptz not null default now()
-- );

-- -- -- ------------------------------------------------------------
-- -- -- الأطباء
-- -- -- ------------------------------------------------------------
-- -- create table doctors (
-- --   id bigserial primary key,
-- --   user_id uuid references users (id) on delete set null, -- اختياري: ربط بحساب دخول
-- --   name text not null,
-- --   title text not null,
-- --   specialty text not null,
-- --   initials text not null,
-- --   image_url text,
-- --   bio text,
-- --   is_active boolean not null default true,
-- --   sort_order int not null default 0,
-- --   created_at timestamptz not null default now()
-- -- );


-- -- ------------------------------------------------------------
-- -- الأطباء والملفات المهنية
-- -- ------------------------------------------------------------
-- CCREATE TABLE doctors (
--   id BIGSERIAL PRIMARY KEY,

--   -- Login account
--   user_id UUID REFERENCES users(id) ON DELETE SET NULL,

--   -- Basic information
--   name TEXT NOT NULL,
--   title TEXT NOT NULL,
--   initials TEXT NOT NULL,

--   -- Professional classification
--   role VARCHAR(30) NOT NULL DEFAULT 'doctor',
--   specialties TEXT[] NOT NULL DEFAULT '{}',

--   gender VARCHAR(30),
--   image_url TEXT,
--   bio TEXT,

--   -- Education and qualifications
--   medical_school TEXT,
--   degree TEXT,
--   graduation_year INTEGER,
--   postgraduate_qualifications TEXT,
--   residency_fellowship TEXT,
--   board_certifications TEXT,

--   -- Professional information
--   subspecialty TEXT,
--   years_experience INTEGER,
--   languages TEXT[] NOT NULL DEFAULT '{}',
--   clinic_affiliation TEXT,

--   -- Medical license
--   medical_license_number TEXT,

--   -- Display settings
--   is_active BOOLEAN NOT NULL DEFAULT TRUE,
--   sort_order INTEGER NOT NULL DEFAULT 0,

--   -- Timestamps
--   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

--   -- Validation
--   CONSTRAINT doctors_gender_check
--     CHECK (
--       gender IS NULL OR gender IN ('male', 'female')
--     ),

--   CONSTRAINT doctors_role_check
--     CHECK (
--       role IN ('doctor', 'specialist')
--     ),

--   CONSTRAINT doctors_graduation_year_check
--     CHECK (
--       graduation_year IS NULL OR
--       graduation_year BETWEEN 1900 AND 2100
--     ),

--   CONSTRAINT doctors_experience_check
--     CHECK (
--       years_experience IS NULL OR years_experience >= 0
--     )
-- );

-- -- One login account per doctor profile
-- CREATE UNIQUE INDEX doctors_user_id_unique
--   ON doctors(user_id)
--   WHERE user_id IS NOT NULL;

-- -- Active doctors ordering
-- CREATE INDEX doctors_active_sort_idx
--   ON doctors(is_active, sort_order, id);

-- -- Search by specialty
-- CREATE INDEX doctors_specialties_idx
--   ON doctors USING GIN(specialties);
-- create table doctor_schedule (
--   id bigserial primary key,
--   doctor_id bigint not null references doctors (id) on delete cascade,
--   day_of_week text,
--   start_time text,
--   end_time text,
--   note text,
--   sort_order int not null default 0
-- );

-- -- ------------------------------------------------------------
-- -- الخدمات ولماذا نحن
-- -- ------------------------------------------------------------
-- create table services (
--   id bigserial primary key,
--   icon text not null,
--   title text not null,
--   description text not null,
--   sort_order int not null default 0
-- );

-- create table why_us (
--   id bigserial primary key,
--   icon text not null,
--   title text not null,
--   description text not null,
--   sort_order int not null default 0
-- );

-- -- ------------------------------------------------------------
-- -- أوقات العمل
-- -- ------------------------------------------------------------
-- create table working_hours (
--   id bigserial primary key,
--   day_of_week text not null unique,
--   hours_text text not null,
--   is_open boolean not null default true,
--   sort_order int not null default 0
-- );

-- -- ------------------------------------------------------------
-- -- إعدادات العيادة (صف واحد)
-- -- ------------------------------------------------------------
-- create table clinic_settings (
--   id int primary key default 1,
--   name text not null,
--   short_name text not null,
--   tagline text,
--   description text,
--   phone text,
--   phone_display text,
--   whatsapp text,
--   email text,
--   address text,
--   google_maps_url text,
--   google_maps_embed_url text,
--   instagram_url text,
--   whatsapp_url text,
--   twitter_url text,
--   facebook_url text,
--   tiktok_url text,
--   snapchat_url text,
--   constraint single_row check (id = 1)
-- );

-- insert into clinic_settings (id, name, short_name)
-- values (1, 'مصحة روح للطب النفسي', 'مصحة روح');

-- -- ------------------------------------------------------------
-- -- طلبات حجز واردة من الموقع العام
-- -- ------------------------------------------------------------
-- create table appointment_requests (
--   id bigserial primary key,
--   doctor_id bigint references doctors (id) on delete set null,
--   patient_name text not null,
--   patient_phone text not null,
--   preferred_day text,
--   notes text,
--   status text not null default 'new',
--   created_at timestamptz not null default now()
-- );

-- -- ------------------------------------------------------------
-- -- المرضى (سجل بسيط يديره الموظفون من لوحة التحكم)
-- -- ------------------------------------------------------------
-- create table patients (
--   id bigserial primary key,
--   full_name text not null,
--   phone text not null,
--   email text,
--   notes text,
--   preferred_doctor_id bigint references doctors (id) on delete set null,
--   created_at timestamptz not null default now()
-- );

-- create index idx_patients_phone on patients (phone);

-- -- ------------------------------------------------------------
-- -- الإعلانات (تظهر في الموقع العام فقط إذا كانت مفعّلة)
-- -- ------------------------------------------------------------
-- create table announcements (
--   id bigserial primary key,
--   title text,
--   message text not null,
--   is_active boolean not null default true,
--   sort_order int not null default 0,
--   created_at timestamptz not null default now()
-- );


-- -- ============================================================
-- -- المدفوعات وإيصالات الدفع
-- -- ============================================================

-- CREATE TABLE payments (
--   id BIGSERIAL PRIMARY KEY,

--   -- ربط الدفعة بالمريض أو بطلب الحجز (اختياري)
--   patient_id BIGINT REFERENCES patients(id) ON DELETE SET NULL,
--   appointment_request_id BIGINT
--     REFERENCES appointment_requests(id) ON DELETE SET NULL,

--   -- بيانات المريض وقت تقديم الدفع
--   patient_name TEXT NOT NULL,
--   patient_phone TEXT NOT NULL,

--   -- بيانات الدفع
--   amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
--   currency VARCHAR(3) NOT NULL DEFAULT 'LYD',

--   payment_method TEXT NOT NULL DEFAULT 'bank_transfer'
--     CHECK (
--       payment_method IN (
--         'bank_transfer',
--         'cash',
--         'card',
--         'other'
--       )
--     ),

--   transaction_reference TEXT,

--   -- رابط صورة الإيصال أو مسار الملف في التخزين
--   receipt_image_url TEXT,

--   -- تاريخ الدفع الفعلي الذي يحدده المريض
--   payment_date DATE,

--   -- حالة الدفع
--   status TEXT NOT NULL DEFAULT 'pending'
--     CHECK (
--       status IN (
--         'pending',
--         'approved',
--         'rejected',
--         'refunded'
--       )
--     ),

--   -- ملاحظات المريض والموظفين
--   notes TEXT,
--   rejection_reason TEXT,

--   -- الموظف الذي راجع الإيصال
--   verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
--   verified_at TIMESTAMPTZ,

--   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- );

-- -- تسريع البحث عن مدفوعات مريض معين
-- CREATE INDEX idx_payments_patient_id
--   ON payments(patient_id);

-- -- تسريع البحث عن مدفوعات طلب حجز معين
-- CREATE INDEX idx_payments_appointment_request_id
--   ON payments(appointment_request_id);

-- -- تسريع عرض المدفوعات حسب الحالة
-- CREATE INDEX idx_payments_status
--   ON payments(status);

-- -- ترتيب المدفوعات من الأحدث إلى الأقدم
-- CREATE INDEX idx_payments_created_at
--   ON payments(created_at DESC);

-- -- تحديث updated_at تلقائياً عند تعديل السجل
-- CREATE OR REPLACE FUNCTION update_payments_updated_at()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   NEW.updated_at = NOW();
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- CREATE TRIGGER trg_payments_updated_at
-- BEFORE UPDATE ON payments
-- FOR EACH ROW
-- EXECUTE FUNCTION update_payments_updated_at();

-- -- ============================================================
-- -- ملاحظة: أنشئ أول حساب super_admin عبر سكربت السيرفر:
-- --   npm run create-admin -- --email you@rouh.ly --password "..." --name "اسمك"
-- -- (راجع server/README.md)
-- -- ============================================================

-- ============================================================
-- مصحة روح — Rouhly Database Schema
-- PostgreSQL
-- ============================================================

-- ------------------------------------------------------------
-- Employee roles
-- ------------------------------------------------------------

CREATE TYPE employee_role AS ENUM (
  'super_admin',
  'admin',
  'doctor',
  'staff'
);

-- ------------------------------------------------------------
-- Job titles
-- ------------------------------------------------------------

CREATE TABLE job_titles (
  id BIGSERIAL PRIMARY KEY,
  title_ar TEXT NOT NULL UNIQUE
);

INSERT INTO job_titles (title_ar) VALUES
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
-- Users
-- ------------------------------------------------------------

CREATE TABLE users (
  id UUID PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role employee_role NOT NULL DEFAULT 'staff',
  job_title TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Doctors
-- ------------------------------------------------------------

CREATE TABLE doctors (
  id BIGSERIAL PRIMARY KEY,

  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  name TEXT NOT NULL,
  title TEXT NOT NULL,
  initials TEXT NOT NULL,

  -- doctor or specialist
  role VARCHAR(30) NOT NULL DEFAULT 'doctor',

  gender VARCHAR(30),
  image_url TEXT,
  bio TEXT,

  -- Education
  medical_school TEXT,
  degree TEXT,
  graduation_year INTEGER,
  postgraduate_qualifications TEXT,
  residency_fellowship TEXT,
  board_certifications TEXT,

  -- Professional information
  subspecialty TEXT,
  years_experience INTEGER,
  languages TEXT[] NOT NULL DEFAULT '{}',
  clinic_affiliation TEXT,

  -- Private license information
  medical_license_number TEXT,

  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT doctors_gender_check
    CHECK (
      gender IS NULL OR gender IN ('male', 'female')
    ),

  CONSTRAINT doctors_role_check
    CHECK (
      role IN ('doctor', 'specialist')
    ),

  CONSTRAINT doctors_graduation_year_check
    CHECK (
      graduation_year IS NULL OR
      graduation_year BETWEEN 1900 AND 2100
    ),

  CONSTRAINT doctors_experience_check
    CHECK (
      years_experience IS NULL OR
      years_experience >= 0
    )
);

CREATE UNIQUE INDEX doctors_user_id_unique
ON doctors(user_id)
WHERE user_id IS NOT NULL;

CREATE INDEX doctors_active_sort_idx
ON doctors(is_active, sort_order, id);

-- ------------------------------------------------------------
-- Specialties
-- ------------------------------------------------------------

CREATE TABLE specialties (
  id BIGSERIAL PRIMARY KEY,

  name TEXT NOT NULL UNIQUE,
  description TEXT,

  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX specialties_active_sort_idx
ON specialties(is_active, sort_order, id);

-- ------------------------------------------------------------
-- Doctor specialties (Many-to-many)
-- ------------------------------------------------------------

CREATE TABLE doctor_specialties (
  doctor_id BIGINT NOT NULL
    REFERENCES doctors(id) ON DELETE CASCADE,

  specialty_id BIGINT NOT NULL
    REFERENCES specialties(id) ON DELETE CASCADE,

  PRIMARY KEY (doctor_id, specialty_id)
);

CREATE INDEX doctor_specialties_specialty_idx
ON doctor_specialties(specialty_id);

-- ------------------------------------------------------------
-- Initial specialties
-- ------------------------------------------------------------

INSERT INTO specialties (name, sort_order) VALUES
  ('الطب النفسي', 1),
  ('علاج الإدمان', 2),
  ('العلاج النفسي', 3),
  ('العلاج المعرفي السلوكي', 4),
  ('الطب النفسي للأطفال والمراهقين', 5),
  ('العلاج الأسري', 6),
  ('الاستشارات النفسية', 7);
  ('علاج القلق', 8),
  ('علاج الاكتئاب', 9),
  ('علاج الاضطرابات الجنسية', 10),




-- ------------------------------------------------------------
-- Doctor schedules
-- ------------------------------------------------------------

CREATE TABLE doctor_schedule (
  id BIGSERIAL PRIMARY KEY,
  doctor_id BIGINT NOT NULL
    REFERENCES doctors(id) ON DELETE CASCADE,

  day_of_week TEXT,
  start_time TEXT,
  end_time TEXT,
  note TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- ------------------------------------------------------------
-- Services
-- ------------------------------------------------------------

CREATE TABLE services (
  id BIGSERIAL PRIMARY KEY,
  icon TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- ------------------------------------------------------------
-- Why us
-- ------------------------------------------------------------

CREATE TABLE why_us (
  id BIGSERIAL PRIMARY KEY,
  icon TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- ------------------------------------------------------------
-- Working hours
-- ------------------------------------------------------------

CREATE TABLE working_hours (
  id BIGSERIAL PRIMARY KEY,
  day_of_week TEXT NOT NULL UNIQUE,
  hours_text TEXT NOT NULL,
  is_open BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- ------------------------------------------------------------
-- Clinic settings
-- ------------------------------------------------------------

CREATE TABLE clinic_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  phone TEXT,
  phone_display TEXT,
  whatsapp TEXT,
  email TEXT,
  address TEXT,
  google_maps_url TEXT,
  google_maps_embed_url TEXT,
  instagram_url TEXT,
  whatsapp_url TEXT,
  twitter_url TEXT,
  facebook_url TEXT,
  tiktok_url TEXT,
  snapchat_url TEXT,

  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO clinic_settings (id, name, short_name)
VALUES (1, 'مصحة روح للطب النفسي', 'مصحة روح');

-- ------------------------------------------------------------
-- Appointment requests
-- ------------------------------------------------------------

CREATE TABLE appointment_requests (
  id BIGSERIAL PRIMARY KEY,
  doctor_id BIGINT
    REFERENCES doctors(id) ON DELETE SET NULL,

  patient_name TEXT NOT NULL,
  patient_phone TEXT NOT NULL,
  preferred_day TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Patients
-- ------------------------------------------------------------

CREATE TABLE patients (
  id BIGSERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  notes TEXT,
  preferred_doctor_id BIGINT
    REFERENCES doctors(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patients_phone
ON patients(phone);

-- ------------------------------------------------------------
-- Announcements
-- ------------------------------------------------------------

CREATE TABLE announcements (
  id BIGSERIAL PRIMARY KEY,
  title TEXT,
  message TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Payments
-- ------------------------------------------------------------

CREATE TABLE payments (
  id BIGSERIAL PRIMARY KEY,

  patient_id BIGINT
    REFERENCES patients(id) ON DELETE SET NULL,

  appointment_request_id BIGINT
    REFERENCES appointment_requests(id) ON DELETE SET NULL,

  patient_name TEXT NOT NULL,
  patient_phone TEXT NOT NULL,

  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'LYD',

  payment_method TEXT NOT NULL DEFAULT 'bank_transfer'
    CHECK (
      payment_method IN (
        'bank_transfer',
        'cash',
        'card',
        'other'
      )
    ),

  transaction_reference TEXT,
  receipt_image_url TEXT,
  payment_date DATE,

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (
      status IN (
        'pending',
        'approved',
        'rejected',
        'refunded'
      )
    ),

  notes TEXT,
  rejection_reason TEXT,

  verified_by UUID
    REFERENCES users(id) ON DELETE SET NULL,

  verified_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_patient_id
ON payments(patient_id);

CREATE INDEX idx_payments_appointment_request_id
ON payments(appointment_request_id);

CREATE INDEX idx_payments_status
ON payments(status);

CREATE INDEX idx_payments_created_at
ON payments(created_at DESC);

-- ------------------------------------------------------------
-- Automatically update payments.updated_at
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_payments_updated_at
BEFORE UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION update_payments_updated_at();
