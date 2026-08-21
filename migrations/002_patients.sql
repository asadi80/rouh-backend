-- ============================================================
-- ترحيل: إضافة جدول المرضى
-- شغّله على قاعدة بيانات تم تشغيل schema.sql عليها مسبقًا:
--   psql "postgres://user:pass@host:port/dbname" -f migrations/002_patients.sql
-- ============================================================

create table if not exists patients (
  id bigserial primary key,
  full_name text not null,
  phone text not null,
  email text,
  notes text,
  preferred_doctor_id bigint references doctors (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_patients_phone on patients (phone);
