create table if not exists public.mixed_trainer_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  squares_difficulty text not null default 'warmup'
    check (squares_difficulty in ('off', 'warmup', 'easy', 'medium', 'hard')),
  multiplication_difficulty text not null default 'warmup'
    check (multiplication_difficulty in ('off', 'warmup', 'easy', 'medium', 'hard', 'expert')),
  addition_difficulty text not null default 'warmup'
    check (addition_difficulty in ('off', 'warmup', 'easy', 'medium', 'hard', 'expert')),
  subtraction_difficulty text not null default 'warmup'
    check (subtraction_difficulty in ('off', 'warmup', 'easy', 'medium', 'hard', 'expert')),
  division_difficulty text not null default 'warmup'
    check (division_difficulty in ('off', 'warmup', 'easy', 'medium', 'hard')),
  round_size smallint not null default 7
    check (round_size in (3, 7, 21, 55, 111)),
  rtl_input boolean not null default false,
  hide_timer boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.mixed_trainer_preferences enable row level security;
alter table public.mixed_trainer_preferences force row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'mixed_trainer_preferences'
      and policyname = 'mixed_trainer_preferences_select_own'
  ) then
    create policy mixed_trainer_preferences_select_own
      on public.mixed_trainer_preferences
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
      and tablename = 'mixed_trainer_preferences'
      and policyname = 'mixed_trainer_preferences_insert_own'
  ) then
    create policy mixed_trainer_preferences_insert_own
      on public.mixed_trainer_preferences
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
      and tablename = 'mixed_trainer_preferences'
      and policyname = 'mixed_trainer_preferences_update_own'
  ) then
    create policy mixed_trainer_preferences_update_own
      on public.mixed_trainer_preferences
      for update
      to authenticated
      using ((select auth.uid()) = user_id)
      with check ((select auth.uid()) = user_id);
  end if;
end $$;
