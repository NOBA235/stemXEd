-- ============================================================
--  Migration 003: Video Recommendations
--  Stores unlisted YouTube videos mapped to curriculum topics
-- ============================================================

create table public.videos (
  id           uuid primary key default gen_random_uuid(),
  youtube_id   text not null,                -- unlisted YouTube video ID string
  title        text not null,
  class_level  int  not null,                -- 8 | 9 | 10 | 11 | 12 | 13 (college)
  subject      text not null check (subject in ('mathematics','physics','chemistry','biology','general')),
  chapter      text not null,                -- e.g. "Laws of Motion"
  concept_tags text[] not null default '{}', -- e.g. {friction, acceleration, "Newton second law"}
  created_at   timestamptz default now()
);

-- Fast lookups by the three match fields
create index idx_videos_subject      on public.videos(subject);
create index idx_videos_class_level  on public.videos(class_level);
create index idx_videos_chapter      on public.videos(chapter);

-- Composite index for the exact query pattern used in the solver:
-- WHERE class_level = $1 AND subject = $2 AND chapter = $3
create index idx_videos_match
  on public.videos(class_level, subject, chapter);

-- RLS
alter table public.videos enable row level security;

-- Students can read videos (they are educational content, not personal data)
create policy "Anyone can read videos"
  on public.videos for select
  using (true);

-- Only admins and service role can manage videos
create policy "Admins can manage videos"
  on public.videos for all
  using (
    auth.role() = 'service_role'
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ── Sample data — replace youtube_id values with your real unlisted video IDs ──
insert into public.videos (youtube_id, title, class_level, subject, chapter, concept_tags) values
  ('dQw4w9WgXcQ', 'Newton Laws of Motion — Class 11 Physics',          11, 'physics',     'Laws of Motion',          array['newton second law', 'friction', 'acceleration', 'net force', 'F=ma']),
  ('dQw4w9WgXcQ', 'Kinematics — Equations of Motion',                   11, 'physics',     'Motion in a Straight Line',array['kinematics', 'velocity', 'acceleration', 'displacement', 'SUVAT']),
  ('dQw4w9WgXcQ', 'Quadratic Equations — Step by Step',                 10, 'mathematics', 'Quadratic Equations',     array['quadratic formula', 'discriminant', 'factoring', 'roots', 'parabola']),
  ('dQw4w9WgXcQ', 'Integration by Parts — Class 12 Maths',              12, 'mathematics', 'Integrals',               array['integration by parts', 'integral', 'calculus', 'LIATE', 'antiderivative']),
  ('dQw4w9WgXcQ', 'Acids Bases and Salts — NCERT Chemistry',            10, 'chemistry',   'Acids, Bases and Salts',  array['pH', 'acid', 'base', 'neutralisation', 'salt']),
  ('dQw4w9WgXcQ', 'Electrochemistry — Class 12',                        12, 'chemistry',   'Electrochemistry',        array['electrolysis', 'oxidation', 'reduction', 'electrode', 'electrolyte']),
  ('dQw4w9WgXcQ', 'Cell Division — Mitosis and Meiosis',                11, 'biology',     'Cell Cycle and Cell Division', array['mitosis', 'meiosis', 'cell division', 'chromosome', 'prophase']),
  ('dQw4w9WgXcQ', 'Photosynthesis — Light and Dark Reactions',          11, 'biology',     'Photosynthesis in Higher Plants', array['photosynthesis', 'chlorophyll', 'Calvin cycle', 'ATP', 'glucose']);

-- NOTE: Replace 'dQw4w9WgXcQ' with your actual unlisted YouTube video IDs
-- To get an unlisted video ID: upload to YouTube → set to Unlisted → copy the ID from the URL
-- URL: https://youtube.com/watch?v=XXXXXXXXXXX  →  ID = XXXXXXXXXXX
