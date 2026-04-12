create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme_key text,
  trainer_operation text not null check (
    trainer_operation in ('ADDITION', 'SUBTRACTION', 'MULTIPLICATION', 'DIVISION')
  ),
  trainer_left_digits smallint not null check (trainer_left_digits between 1 and 8),
  trainer_right_digits smallint not null check (trainer_right_digits between 1 and 8),
  trainer_round_size integer not null check (trainer_round_size between 3 and 10000),
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;
alter table public.user_preferences force row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_preferences'
      and policyname = 'user_preferences_select_own'
  ) then
    create policy user_preferences_select_own
      on public.user_preferences
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
      and tablename = 'user_preferences'
      and policyname = 'user_preferences_insert_own'
  ) then
    create policy user_preferences_insert_own
      on public.user_preferences
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
      and tablename = 'user_preferences'
      and policyname = 'user_preferences_update_own'
  ) then
    create policy user_preferences_update_own
      on public.user_preferences
      for update
      to authenticated
      using ((select auth.uid()) = user_id)
      with check ((select auth.uid()) = user_id);
  end if;
end $$;
