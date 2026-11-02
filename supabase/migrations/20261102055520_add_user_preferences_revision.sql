-- Revisions are assigned by the database, independently of device clocks.
alter table public.user_preferences
  add column if not exists revision bigint not null default 0
  check (revision >= 0);

create or replace function public.set_user_preferences_revision()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if TG_OP = 'INSERT' then
    NEW.revision := 1;
  else
    NEW.revision := OLD.revision + 1;
  end if;
  NEW.updated_at := clock_timestamp();
  return NEW;
end;
$$;

revoke all on function public.set_user_preferences_revision() from public;

drop trigger if exists user_preferences_assign_revision on public.user_preferences;
create trigger user_preferences_assign_revision
  before insert or update on public.user_preferences
  for each row execute function public.set_user_preferences_revision();
