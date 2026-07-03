-- ============================================================
-- Территория Спорта КИДС — настройка базы данных Supabase
-- Запустите этот скрипт целиком: Supabase Dashboard -> SQL Editor
-- -> New query -> вставить -> Run. Скрипт можно запускать повторно.
-- ============================================================

-- ---------- Таблицы ----------

create table if not exists public.settings (
  key   text primary key,
  value text not null default ''
);

create table if not exists public.coaches (
  id        bigint generated always as identity primary key,
  name      text not null,
  tag_pos   text not null default 'Тренер',
  tag_exp   text not null default '',
  bio       text not null default '',
  photo_url text not null default '',
  sort      int  not null default 0
);

create table if not exists public.schedule (
  id    bigint generated always as identity primary key,
  dir   text not null,  -- gym | acro | rhythmic | tramp | ofp
  age   text not null,  -- 1.5-3 | 3-5 | 5-7 | 7-10 | 10-14
  day   text not null,  -- mon..sun
  time  text not null,  -- например 10:00–10:45
  coach text not null default '',
  spots int  not null default 0,
  sort  int  not null default 0
);

create table if not exists public.messages (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  context    text not null default '',
  payload    jsonb not null default '{}'::jsonb,
  read       boolean not null default false
);

create table if not exists public.reviews (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name       text not null,
  contact    text not null default '',
  text       text not null,
  approved   boolean not null default false
);

-- ---------- Права доступа ----------
-- Администратор — пользователь, вошедший с этим email.
-- Если захотите другой email — поменяйте его здесь и запустите скрипт снова.

create or replace function public.is_admin() returns boolean
language sql stable as $$
  select coalesce(lower(auth.jwt() ->> 'email'), '') = lower('paulinalitvak04@gmail.com')
$$;

alter table public.settings enable row level security;
alter table public.coaches  enable row level security;
alter table public.schedule enable row level security;
alter table public.messages enable row level security;
alter table public.reviews  enable row level security;

drop policy if exists "public read settings"  on public.settings;
drop policy if exists "admin all settings"    on public.settings;
drop policy if exists "public read coaches"   on public.coaches;
drop policy if exists "admin all coaches"     on public.coaches;
drop policy if exists "public read schedule"  on public.schedule;
drop policy if exists "admin all schedule"    on public.schedule;
drop policy if exists "anyone sends message"  on public.messages;
drop policy if exists "admin all messages"    on public.messages;
drop policy if exists "read approved reviews" on public.reviews;
drop policy if exists "anyone sends review"   on public.reviews;
drop policy if exists "admin all reviews"     on public.reviews;

-- Контент сайта читают все
create policy "public read settings" on public.settings for select using (true);
create policy "public read coaches"  on public.coaches  for select using (true);
create policy "public read schedule" on public.schedule for select using (true);

-- Заявки и отзывы может отправить любой посетитель;
-- отзыв всегда попадает на модерацию (approved = false)
create policy "anyone sends message" on public.messages for insert with check (true);
create policy "anyone sends review"  on public.reviews  for insert with check (approved is not true);

-- Опубликованные отзывы видят все, остальные — только админ
create policy "read approved reviews" on public.reviews for select using (approved or public.is_admin());

-- Админ может всё
create policy "admin all settings" on public.settings for all using (public.is_admin()) with check (public.is_admin());
create policy "admin all coaches"  on public.coaches  for all using (public.is_admin()) with check (public.is_admin());
create policy "admin all schedule" on public.schedule for all using (public.is_admin()) with check (public.is_admin());
create policy "admin all messages" on public.messages for all using (public.is_admin()) with check (public.is_admin());
create policy "admin all reviews"  on public.reviews  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Хранилище картинок ----------

insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;

drop policy if exists "public read images"  on storage.objects;
drop policy if exists "admin upload images" on storage.objects;
drop policy if exists "admin update images" on storage.objects;
drop policy if exists "admin delete images" on storage.objects;

create policy "public read images"  on storage.objects for select using (bucket_id = 'images');
create policy "admin upload images" on storage.objects for insert with check (bucket_id = 'images' and public.is_admin());
create policy "admin update images" on storage.objects for update using (bucket_id = 'images' and public.is_admin());
create policy "admin delete images" on storage.objects for delete using (bucket_id = 'images' and public.is_admin());

-- ---------- Стартовые данные (текущее содержимое сайта) ----------
-- Добавляются только если таблицы пустые.

insert into public.coaches (name, tag_pos, tag_exp, bio, photo_url, sort)
select * from (values
  ('Анна Соколова',      'Старший тренер', '7 лет опыта',  'Помогает детям мягко входить в спорт, развивать гибкость и уверенность без страха ошибки.', 'assets/img/coach-w2.png', 1),
  ('Екатерина Морозова', 'Старший тренер', '5 лет опыта',  'Помогает детям мягко входить в спорт, развивать гибкость и уверенность без страха ошибки.', 'assets/img/coach-w1.png', 2),
  ('Дмитрий Орлов',      'Тренер',         '4 года опыта', 'Помогает детям мягко входить в спорт, развивать гибкость и уверенность без страха ошибки.', 'assets/img/coach-m1.png', 3),
  ('Ольга Кузнецова',    'Тренер',         '6 лет опыта',  'Помогает детям мягко входить в спорт, развивать гибкость и уверенность без страха ошибки.', 'assets/img/coach-w2.png', 4),
  ('Сергей Лебедев',     'Старший тренер', '8 лет опыта',  'Помогает детям мягко входить в спорт, развивать гибкость и уверенность без страха ошибки.', 'assets/img/coach-m1.png', 5)
) as v(name, tag_pos, tag_exp, bio, photo_url, sort)
where not exists (select 1 from public.coaches);

insert into public.schedule (dir, age, day, time, coach, spots, sort)
select * from (values
  ('gym',      '1.5-3', 'mon', '10:00–10:45', 'Анна Соколова',      4, 1),
  ('gym',      '3-5',   'mon', '11:00–11:45', 'Анна Соколова',      3, 2),
  ('acro',     '5-7',   'mon', '17:00–17:45', 'Дмитрий Орлов',      5, 3),
  ('ofp',      '7-10',  'tue', '16:00–16:50', 'Дмитрий Орлов',      6, 4),
  ('rhythmic', '5-7',   'tue', '17:30–18:15', 'Ольга Кузнецова',    2, 5),
  ('tramp',    '3-5',   'wed', '10:30–11:15', 'Екатерина Морозова', 4, 6),
  ('gym',      '5-7',   'wed', '17:00–17:45', 'Анна Соколова',      3, 7),
  ('acro',     '7-10',  'wed', '18:00–18:50', 'Дмитрий Орлов',      5, 8),
  ('ofp',      '10-14', 'thu', '18:00–18:55', 'Дмитрий Орлов',      7, 9),
  ('rhythmic', '3-5',   'thu', '16:00–16:40', 'Ольга Кузнецова',    4, 10),
  ('tramp',    '5-7',   'fri', '17:00–17:45', 'Екатерина Морозова', 6, 11),
  ('gym',      '1.5-3', 'sat', '10:00–10:40', 'Анна Соколова',      3, 12),
  ('acro',     '3-5',   'sat', '11:00–11:45', 'Екатерина Морозова', 5, 13),
  ('rhythmic', '7-10',  'sat', '12:00–12:50', 'Ольга Кузнецова',    4, 14)
) as v(dir, age, day, time, coach, spots, sort)
where not exists (select 1 from public.schedule);
