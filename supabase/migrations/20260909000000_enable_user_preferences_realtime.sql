update public.user_preferences
set
  theme_key = 'carbon-paper',
  updated_at = now()
where theme_key is null;

alter table public.user_preferences
  alter column theme_key set default 'carbon-paper',
  alter column theme_key set not null;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'user_preferences'
  ) then
    alter publication supabase_realtime add table public.user_preferences;
  end if;
end $$;
