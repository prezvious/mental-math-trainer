alter table public.user_preferences
  add column if not exists interface_style text not null default 'studio';

alter table public.user_preferences
  add constraint user_preferences_interface_style_check
  check (interface_style in ('studio', 'opaline'));
