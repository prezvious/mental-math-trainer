create or replace function public.is_admin_email(email text)
returns boolean
language sql
immutable
as $$
  select lower(coalesce(email, '')) = any (
    array[
      'saxumfluens@gmail.com',
      'mezmaids@gmail.com',
      'archivesnbt@gmail.com'
    ]
  );
$$;

create table if not exists public.ai_mode_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  question_index integer not null check (question_index > 0),
  source_kind text not null check (source_kind in ('trainer', 'custom')),
  operation_label text not null,
  prompt_text text not null,
  normalized_expression text not null,
  result_kind text not null check (result_kind in ('integer', 'fraction', 'decimal')),
  result_exact_text text not null,
  result_decimal_text text,
  response_ms integer not null check (response_ms > 0),
  created_at timestamptz not null default now()
);

create index if not exists ai_mode_logs_user_created_idx
  on public.ai_mode_logs (user_id, created_at desc);

create index if not exists ai_mode_logs_user_source_idx
  on public.ai_mode_logs (user_id, source_kind);

create index if not exists ai_mode_logs_user_session_idx
  on public.ai_mode_logs (user_id, session_id);

alter table public.ai_mode_logs
  drop constraint if exists ai_mode_logs_user_session_question_key;

alter table public.ai_mode_logs
  add constraint ai_mode_logs_user_session_question_key
  unique (user_id, session_id, question_index);

alter table public.ai_mode_logs enable row level security;
alter table public.ai_mode_logs force row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ai_mode_logs'
      and policyname = 'ai_mode_logs_select_admin_own'
  ) then
    create policy ai_mode_logs_select_admin_own
      on public.ai_mode_logs
      for select
      to authenticated
      using (
        (select auth.uid()) = user_id
        and public.is_admin_email((select auth.jwt() ->> 'email'))
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ai_mode_logs'
      and policyname = 'ai_mode_logs_insert_admin_own'
  ) then
    create policy ai_mode_logs_insert_admin_own
      on public.ai_mode_logs
      for insert
      to authenticated
      with check (
        (select auth.uid()) = user_id
        and public.is_admin_email((select auth.jwt() ->> 'email'))
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ai_mode_logs'
      and policyname = 'ai_mode_logs_delete_admin_own'
  ) then
    create policy ai_mode_logs_delete_admin_own
      on public.ai_mode_logs
      for delete
      to authenticated
      using (
        (select auth.uid()) = user_id
        and public.is_admin_email((select auth.jwt() ->> 'email'))
      );
  end if;
end $$;
