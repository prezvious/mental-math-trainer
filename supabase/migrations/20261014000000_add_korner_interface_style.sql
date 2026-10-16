alter table public.user_preferences
  drop constraint if exists user_preferences_interface_style_check;

alter table public.user_preferences
  add constraint user_preferences_interface_style_check
  check (interface_style in ('studio', 'opaline', 'korner'));
