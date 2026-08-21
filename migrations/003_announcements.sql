-- ============================================================
-- ترحيل: إضافة جدول الإعلانات
--   psql "postgres://user:pass@host:port/dbname" -f migrations/003_announcements.sql
-- ============================================================

create table if not exists announcements (
  id bigserial primary key,
  title text,
  message text not null,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
