-- Run this in your Supabase SQL editor

create table if not exists sessions (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now(),
  status      text not null default 'pending',  -- pending | processing | done | error
  file_count  int default 0,
  excel_path  text,
  error       text
);

-- Storage bucket (run in Supabase dashboard → Storage → New bucket)
-- Name: payslips
-- Public: false
