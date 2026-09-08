alter table public.user_preferences
  add column if not exists display_mode text;

update public.user_preferences
set
  display_mode = 'adaptive',
  updated_at = now()
where display_mode is null
  or display_mode not in ('light', 'dark', 'adaptive');

alter table public.user_preferences
  alter column display_mode set default 'adaptive',
  alter column display_mode set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.user_preferences'::regclass
      and conname = 'user_preferences_display_mode_check'
  ) then
    alter table public.user_preferences
      add constraint user_preferences_display_mode_check
      check (display_mode in ('light', 'dark', 'adaptive'));
  end if;
end $$;
