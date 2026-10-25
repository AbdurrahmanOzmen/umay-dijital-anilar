-- UMAY — Secure family archive setup
-- Run this entire script in Supabase Dashboard > SQL Editor.
-- Before running: create family accounts in Authentication > Users.
-- Then add each user's auth UUID into public.umay_family_members below.

create extension if not exists pgcrypto;

create table if not exists public.umay_family_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Aile üyesi',
  role text not null default 'member' check (role in ('admin','member')),
  created_at timestamptz not null default now()
);
alter table public.umay_family_members enable row level security;

create or replace function public.umay_is_family_member()
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists(select 1 from public.umay_family_members where user_id = auth.uid());
$$;

create or replace function public.umay_is_admin()
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists(select 1 from public.umay_family_members where user_id = auth.uid() and role = 'admin');
$$;

drop policy if exists "Family members can view member list" on public.umay_family_members;
create policy "Family members can view member list" on public.umay_family_members
for select to authenticated using (public.umay_is_family_member());

create table if not exists public.umay_photos (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  caption text not null default 'Umay’ın anısı',
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.umay_photos enable row level security;
drop policy if exists "Family can view photos" on public.umay_photos;
create policy "Family can view photos" on public.umay_photos for select to authenticated using (public.umay_is_family_member());
drop policy if exists "Family can add photos" on public.umay_photos;
create policy "Family can add photos" on public.umay_photos for insert to authenticated with check (public.umay_is_family_member() and uploaded_by = auth.uid());
drop policy if exists "Uploader or admin can delete photos" on public.umay_photos;
create policy "Uploader or admin can delete photos" on public.umay_photos for delete to authenticated using (uploaded_by = auth.uid() or public.umay_is_admin());

create table if not exists public.umay_letters (
  id uuid primary key default gen_random_uuid(),
  author_name text not null,
  title text not null,
  body text not null check (char_length(body) <= 3000),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.umay_letters enable row level security;
drop policy if exists "Family can read letters" on public.umay_letters;
create policy "Family can read letters" on public.umay_letters for select to authenticated using (public.umay_is_family_member());
drop policy if exists "Family can write letters" on public.umay_letters;
create policy "Family can write letters" on public.umay_letters for insert to authenticated with check (public.umay_is_family_member() and created_by = auth.uid());
drop policy if exists "Author or admin can delete letters" on public.umay_letters;
create policy "Author or admin can delete letters" on public.umay_letters for delete to authenticated using (created_by = auth.uid() or public.umay_is_admin());

create table if not exists public.umay_capsules (
  id uuid primary key default gen_random_uuid(),
  unlock_at timestamptz not null,
  message text not null check (char_length(message) <= 2000),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.umay_capsules enable row level security;
-- Family can only read capsules after their unlock time, or their own capsule.
drop policy if exists "Family can read unlocked capsules or own" on public.umay_capsules;
create policy "Family can read unlocked capsules or own" on public.umay_capsules
for select to authenticated using (public.umay_is_family_member() and unlock_at <= now());
drop policy if exists "Family can create capsules" on public.umay_capsules;
create policy "Family can create capsules" on public.umay_capsules for insert to authenticated with check (public.umay_is_family_member() and created_by = auth.uid());
drop policy if exists "Author or admin can delete capsules" on public.umay_capsules;
create policy "Author or admin can delete capsules" on public.umay_capsules for delete to authenticated using (created_by = auth.uid() or public.umay_is_admin());

-- Create a PRIVATE bucket for baby photos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('umay-photos', 'umay-photos', false, 8388608, array['image/jpeg','image/png','image/webp','image/gif','image/heic'])
on conflict (id) do update set public = false, file_size_limit = 8388608;

drop policy if exists "Family can read private Umay photos" on storage.objects;
create policy "Family can read private Umay photos" on storage.objects
for select to authenticated using (bucket_id = 'umay-photos' and public.umay_is_family_member());

drop policy if exists "Family can upload private Umay photos" on storage.objects;
create policy "Family can upload private Umay photos" on storage.objects
for insert to authenticated with check (
  bucket_id = 'umay-photos'
  and public.umay_is_family_member()
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Uploader or admin can delete private Umay photos" on storage.objects;
create policy "Uploader or admin can delete private Umay photos" on storage.objects
for delete to authenticated using (
  bucket_id = 'umay-photos'
  and public.umay_is_family_member()
  and ((storage.foldername(name))[1] = auth.uid()::text or public.umay_is_admin())
);

-- IMPORTANT NEXT STEP:
-- In Authentication > Users, create each family account.
-- Copy each user's UUID, then run an insert such as:
-- insert into public.umay_family_members (user_id, display_name, role)
-- values ('PASTE-AUTH-USER-UUID-HERE', 'Aile yöneticisi', 'admin');
-- For other family members use role='member'.
