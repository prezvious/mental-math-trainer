create extension if not exists pgcrypto;

create table if not exists public.progress_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  question_index smallint not null check (question_index > 0),
  operation text not null check (
    operation in ('ADDITION', 'SUBTRACTION', 'MULTIPLICATION', 'DIVISION')
  ),
  digits_left smallint not null check (digits_left between 1 and 8),
  digits_right smallint not null check (digits_right between 1 and 8),
  left_operand integer not null check (left_operand > 0),
  right_operand integer not null check (right_operand > 0),
  correct_answer text not null check (correct_answer ~ '^-?[0-9]+$'),
  submitted_answer text not null check (submitted_answer ~ '^-?[0-9]+$'),
  is_correct boolean not null,
  response_ms integer not null check (response_ms > 0),
  created_at timestamptz not null default now()
);

create index if not exists progress_logs_user_created_idx
  on public.progress_logs (user_id, created_at desc);

create index if not exists progress_logs_user_operation_idx
  on public.progress_logs (user_id, operation);

create index if not exists progress_logs_user_session_idx
  on public.progress_logs (user_id, session_id);

alter table public.progress_logs enable row level security;
alter table public.progress_logs force row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'progress_logs'
      and policyname = 'progress_logs_select_own'
  ) then
    create policy progress_logs_select_own
      on public.progress_logs
      for select
      to authenticated
      using ((select auth.uid()) = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'progress_logs'
      and policyname = 'progress_logs_insert_own'
  ) then
    create policy progress_logs_insert_own
      on public.progress_logs
      for insert
      to authenticated
      with check ((select auth.uid()) = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'progress_logs'
      and policyname = 'progress_logs_delete_own'
  ) then
    create policy progress_logs_delete_own
      on public.progress_logs
      for delete
      to authenticated
      using ((select auth.uid()) = user_id);
  end if;
end $$;
