-- ลอยกระทง Festival: database setup
-- Run this whole file once in Supabase → SQL Editor → New query → Run.
-- Safe to re-run: it drops and recreates the functions and policies, and keeps existing rows.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table if not exists public.krathongs (
  id          uuid primary key default gen_random_uuid(),
  base        text not null check (base in ('banana', 'bread', 'trunk')),
  flower      text not null check (flower in ('sun', 'sunflower', 'dino', 'rose', 'banana', 'peach', 'rabbit')),
  -- Small picture made by the site (96×96 JPEG, or 32×32 PNG from older versions); anything else is rejected
  image       text,
  wish        text not null check (char_length(btrim(wish)) between 1 and 40),
  name        text not null default '' check (char_length(name) <= 16),
  created_at  timestamptz not null default now()
);

create index if not exists krathongs_created_at_idx on public.krathongs (created_at desc);

-- Picture rule (kept separate so re-running this file updates it on an existing table)
alter table public.krathongs drop constraint if exists krathongs_image_check;
alter table public.krathongs add constraint krathongs_image_check check (
  image is null or (
    (image like 'data:image/jpeg;base64,%' or image like 'data:image/png;base64,%')
    and length(image) <= 20000
  )
);

-- ---------------------------------------------------------------------------
-- Access: anyone may read and float a krathong; nobody may edit or delete through the API
-- ---------------------------------------------------------------------------
alter table public.krathongs enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.krathongs to anon, authenticated;
-- Only these columns can be written; id and created_at are always set by the database
grant insert (base, flower, image, wish, name) on public.krathongs to anon, authenticated;

drop policy if exists "anyone can read krathongs" on public.krathongs;
create policy "anyone can read krathongs" on public.krathongs
  for select to anon, authenticated using (true);

drop policy if exists "anyone can float a krathong" on public.krathongs;
create policy "anyone can float a krathong" on public.krathongs
  for insert to anon, authenticated with check (true);

-- ---------------------------------------------------------------------------
-- Random krathongs for the river (skips the ones already on screen)
-- ---------------------------------------------------------------------------
drop function if exists public.random_krathongs(int, uuid[]);
create function public.random_krathongs(n int, exclude uuid[] default '{}')
returns setof public.krathongs
language sql stable
set search_path = public
as $$
  select * from public.krathongs
  where not (id = any(coalesce(exclude, '{}')))
  order by random()
  limit least(greatest(n, 0), 60);
$$;
grant execute on function public.random_krathongs(int, uuid[]) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Admin: delete every krathong. The code is checked here on the server, so it
-- can't be skipped by editing the website. Only its SHA-256 hash is stored.
-- ---------------------------------------------------------------------------
drop function if exists public.admin_clear_krathongs(text);
create function public.admin_clear_krathongs(code text)
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  removed bigint;
begin
  if encode(extensions.digest(coalesce(code, ''), 'sha256'), 'hex')
     <> '28351392195443a09c606a98d4687252a67138aedd655bae882b84b87d9dff06' then
    raise exception 'invalid admin code' using errcode = '28000';
  end if;
  delete from public.krathongs where true;
  get diagnostics removed = row_count;
  return removed;
end;
$$;
revoke all on function public.admin_clear_krathongs(text) from public;
grant execute on function public.admin_clear_krathongs(text) to anon, authenticated;
