-- Add trainer_max_base column to user_preferences
alter table public.user_preferences
  add column if not exists trainer_max_base smallint not null default 10
  check (trainer_max_base between 2 and 20);

-- Update trainer_operation CHECK to include EXPONENTIATION
alter table public.user_preferences
  drop constraint if exists user_preferences_trainer_operation_check;

alter table public.user_preferences
  add constraint user_preferences_trainer_operation_check
  check (trainer_operation in ('ADDITION', 'SUBTRACTION', 'MULTIPLICATION', 'DIVISION', 'SQUARES', 'EXPONENTIATION'));

-- Update progress_logs operation CHECK to include EXPONENTIATION
alter table public.progress_logs
  drop constraint if exists progress_logs_operation_check;

alter table public.progress_logs
  add constraint progress_logs_operation_check
  check (operation in ('ADDITION', 'SUBTRACTION', 'MULTIPLICATION', 'DIVISION', 'SQUARES', 'EXPONENTIATION'));

-- Rename squares_difficulty to exponentiation_difficulty in mixed_trainer_preferences
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'mixed_trainer_preferences'
      and column_name = 'squares_difficulty'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'mixed_trainer_preferences'
      and column_name = 'exponentiation_difficulty'
  ) then
    execute 'alter table public.mixed_trainer_preferences rename column squares_difficulty to exponentiation_difficulty';
  end if;
end $$;
